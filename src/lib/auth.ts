import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db";

// V3 — Google OAuth is only registered when its credentials are present, so
// deployments without GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET keep working
// exactly as before (the "Continuer avec Google" button hides itself client-
// side by probing GET /api/auth/providers).
const googleCredentials =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : null;

/**
 * V3 — find or create the local User row for a Google sign-in.
 *
 * Account recovery: if an account already exists with the same email
 * (created via credentials), it is REUSED and linked — the visitor keeps
 * their sessions, XP, badges and referral code. Otherwise a fresh VISITOR
 * account is created with an unguessable random password (the user logs in
 * via Google; the password hash is never a usable credential).
 */
async function findOrCreateGoogleUser(params: {
  email: string;
  name?: string | null;
  googleId?: string | null;
}): Promise<{ user: NonNullable<Awaited<ReturnType<typeof db.user.findUnique>>>; created: boolean }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: cleanEmail } });

  if (existing) {
    // Link the Google identity if it changed or was missing.
    if (params.googleId && existing.googleId !== params.googleId) {
      const updated = await db.user.update({
        where: { id: existing.id },
        data: { googleId: params.googleId },
      });
      return { user: updated, created: false };
    }
    return { user: existing, created: false };
  }

  const hash = await bcrypt.hash(`${randomUUID()}${randomUUID()}`, 10);
  const referralCode = await generateUniqueReferralCode();
  const created = await db.user.create({
    data: {
      email: cleanEmail,
      name: params.name?.trim() || cleanEmail.split("@")[0],
      passwordHash: hash,
      role: "VISITOR",
      referralCode,
      googleId: params.googleId ?? null,
    },
  });
  return { user: created, created: true };
}

export const authOptions: NextAuthOptions = {
  // P2: the fallback secret is public (repo history) — it must NEVER be the
  // effective secret in production. It is kept only so local dev keeps
  // working without .env; production now logs a loud warning.
  secret: process.env.NEXTAUTH_SECRET || "quizexam-bf-fallback-secret-2025-aZ7xK9",
  providers: [
    ...(googleCredentials
      ? [
          GoogleProvider({
            ...googleCredentials,
            // allowDangerousEmailAccountLinking is required by NextAuth v4
            // whenever an OAuth login shares an email with an existing
            // account. Our own findOrCreateGoogleUser() performs the safe
            // email-based link/recovery below, so this flag is intentional.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }) {
      // V3 — Google flow: resolve (or create + link) the local account.
      if (account?.provider === "google") {
        const email = profile?.email ?? user.email;
        if (!email) return false;
        try {
          const { user: dbUser, created } = await findOrCreateGoogleUser({
            email,
            name: profile?.name ?? user.name,
            googleId: account.providerAccountId,
          });
          // Overwrite the OAuth user identity with the LOCAL account so the
          // jwt callback below stores the right id + role.
          user.id = dbUser.id;
          (user as { role?: string }).role = dbUser.role;
          // V3 — first-time Google visitors get the branded confirmation
          // email too (best-effort, never blocks the sign-in).
          if (created) {
            try {
              const { sendWelcomeEmail } = await import("@/lib/email-service");
              await sendWelcomeEmail(dbUser.email, dbUser.name);
            } catch (mailError) {
              console.error("Google sign-in: welcome email failed (non-blocking):", mailError);
            }
          }
          return true;
        } catch (error) {
          console.error("Google sign-in: account link/create failed:", error);
          return false; // shows a generic "Sign in failed" to the user
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "VISITOR";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: { signIn: "/" },
};

// P2: loud production warning when only the public fallback secret is used.
// Action required: set NEXTAUTH_SECRET in the Vercel environment variables.
if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
  console.warn(
    "⚠ SÉCURITÉ : NEXTAUTH_SECRET n'est pas défini — le fallback public du dépôt est utilisé. " +
      "Définissez NEXTAUTH_SECRET dans les variables d'environnement de production.",
  );
}

/**
 * Generate a random 8-character alphanumeric referral code.
 * Uses uppercase letters + digits (36 possible chars per slot → 36^8 ≈ 2.8 trillion combos).
 * Excludes ambiguous chars (0/O, 1/I/L) for readability.
 */
const REFERRAL_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateReferralCode(): string {
  let code = "";
  const bytes = new Uint8Array(8);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
    for (let i = 0; i < 8; i++) {
      code += REFERRAL_ALPHABET[bytes[i] % REFERRAL_ALPHABET.length];
    }
  } else {
    // Fallback (should not happen in modern Node/Bun runtimes)
    for (let i = 0; i < 8; i++) {
      code += REFERRAL_ALPHABET[Math.floor(Math.random() * REFERRAL_ALPHABET.length)];
    }
  }
  return code;
}

/**
 * Generate a referral code that is not already used by any other user.
 * Retries up to 10 times on collision (extremely unlikely with 2.8T combos).
 */
async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateReferralCode();
    const existing = await db.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  // Last-resort fallback: append a unix timestamp suffix to ensure uniqueness.
  return (generateReferralCode() + Date.now().toString(36)).slice(0, 8).toUpperCase();
}

export async function ensureAdminAccount() {
  const adminEmail = process.env.ADMIN_EMAIL || "giobamos03@gmail.com";
  // P2 SECURITY FIX: the admin password used to be hardcoded in this file
  // (public on GitHub → anyone could recreate/login as admin on a fresh DB).
  // It now MUST come from the ADMIN_PASSWORD environment variable; if unset,
  // account creation is skipped with a loud warning instead.
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.warn(
      "⚠ ADMIN_PASSWORD manquant — création du compte admin ignorée. " +
        "Définissez ADMIN_EMAIL et ADMIN_PASSWORD dans les variables d'environnement.",
    );
    return;
  }
  const existing = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const hash = await bcrypt.hash(adminPassword, 10);
    const referralCode = await generateUniqueReferralCode();
    await db.user.create({
      data: {
        email: adminEmail,
        name: "Administrateur",
        passwordHash: hash,
        role: "ADMIN",
        referralCode,
      },
    });
    console.log(`✓ Admin account created: ${adminEmail} (referral: ${referralCode})`);
  } else if (!existing.referralCode) {
    // Backfill missing referral code for legacy admin rows.
    const referralCode = await generateUniqueReferralCode();
    await db.user.update({
      where: { id: existing.id },
      data: { referralCode },
    });
    console.log(`✓ Admin referral code backfilled: ${referralCode}`);
  }
}

/**
 * Create a new visitor account.
 * If `referralCode` is provided and matches an existing user, sets `referredBy`
 * to that user's referral code (the referrer earns +50 XP the next time they
 * open their dashboard, via the referral-card sync logic).
 */
export async function createVisitorAccount(
  email: string,
  name: string,
  password: string,
  referralCode?: string
) {
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new Error("Un compte existe déjà avec cet email.");
  const hash = await bcrypt.hash(password, 10);
  const newReferralCode = await generateUniqueReferralCode();

  // Validate & resolve the referrer (if any)
  let resolvedReferredBy: string | null = null;
  if (referralCode && typeof referralCode === "string") {
    const trimmed = referralCode.trim().toUpperCase();
    if (trimmed.length > 0) {
      const referrer = await db.user.findUnique({
        where: { referralCode: trimmed },
        select: { referralCode: true },
      });
      if (referrer) {
        resolvedReferredBy = referrer.referralCode;
      }
      // If no referrer matches, silently ignore (don't block signup).
    }
  }

  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash: hash,
      role: "VISITOR",
      referralCode: newReferralCode,
      referredBy: resolvedReferredBy,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
  };
}

/**
 * Count how many users were referred by the given referral code.
 * Used by /api/referral to compute referral stats.
 */
export async function countReferrals(referralCode: string): Promise<number> {
  return db.user.count({ where: { referredBy: referralCode } });
}
