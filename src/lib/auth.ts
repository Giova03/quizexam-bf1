import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
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
  const adminPassword = "Giov@12342005";
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
<<<<<<< Updated upstream
        referralCode,
=======
        referralCode: generateReferralCode(),
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
 * Generates an 8-character referral code (uppercase alphanumerical,
 * excluding ambiguous characters like 0/O or 1/I). Collisions are
 * extremely unlikely for 8 chars from a 31-char alphabet (~31^8 ≈ 8.5e11)
 * but the caller is expected to retry on a unique-constraint violation.
 */
export function generateReferralCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/**
 * Inserts a user with a unique 8-char referral code. Retries up to 5 times
 * in the (very unlikely) event of a collision on the @unique constraint.
 */
async function createUserWithUniqueReferralCode(data: {
  email: string;
  name: string;
  passwordHash: string;
  role: string;
}) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.user.create({
        data: { ...data, referralCode: generateReferralCode() },
      });
    } catch (err) {
      lastError = err;
      // Prisma unique-constraint violation code (P2002) — try again
      const code =
        (err as { code?: string })?.code ??
        (err as { error?: { code?: string } })?.error?.code;
      if (code !== "P2002") throw err;
    }
  }
  throw lastError;
}

export async function createVisitorAccount(email: string, name: string, password: string) {
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new Error("Un compte existe déjà avec cet email.");
  const hash = await bcrypt.hash(password, 10);
  const user = await createUserWithUniqueReferralCode({
    email: email.toLowerCase(),
    name,
    passwordHash: hash,
    role: "VISITOR",
>>>>>>> Stashed changes
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
