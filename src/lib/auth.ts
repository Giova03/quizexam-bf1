import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db";
import { runSchemaMigration } from "./db-bootstrap";

/* ============================================================================
 * AUTH V5 — auto-réparation intégrale.
 *
 * 1) RÉPARATION DE SCHÉMA À LA VOLÉE : si une requête Prisma échoue parce qu'
 *    une colonne récente manque dans la base (ex. User.googleId), le DDL
 *    idempotent est exécuté puis la requête est rejouée. Fini les erreurs
 *    "The column User.googleId does not exist" — la première connexion après
 *    un déploiement répare la base elle-même.
 *
 * 2) BOOTSTRAP ADMIN AUTORÉPARANT : le hash bcrypt du mot de passe admin de
 *    secours est embarqué ci-dessous (un hash bcrypt est à sens unique — il ne
 *    permet PAS de retrouver le mot de passe). À chaque tentative de connexion
 *    admin : si le mot de passe saisi correspond au hash de secours, le hash
 *    stocké en base est resynchronisé automatiquement (compte recréé s'il a
 *    été supprimé). L'admin peut donc TOUJOURS se connecter, même après une
 *    perte de base, une restauration ou un changement de mot de passe oublié.
 *    Kill-switch : ADMIN_BOOTSTRAP_DISABLED=1 dans l'environnement.
 * ========================================================================== */

/** Email du compte administrateur de secours. */
const ADMIN_RECOVERY_EMAIL = "giobamos03@gmail.com";
/** Nom d'affichage du compte admin recréé par le bootstrap. */
const ADMIN_RECOVERY_NAME = "Administrateur";
/**
 * Hash bcrypt (coût 10) du mot de passe admin de secours.
 * IMPORTANT : c'est un HASH, pas le mot de passe — il est public par design
 * (bcrypt est irréversible). Désactivable avec ADMIN_BOOTSTRAP_DISABLED=1.
 */
const ADMIN_RECOVERY_HASH =
  "$2b$10$eqs8h5Ki7uQidD/IYbEPNe4i9dEUXld1cd89CilXenO18ZF7ySy/S";

function adminBootstrapEnabled(): boolean {
  return process.env.ADMIN_BOOTSTRAP_DISABLED !== "1";
}

/** Détecte une erreur Prisma "colonne/table inconnue" (schéma désynchronisé). */
function isSchemaOutdatedError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === "P2022" || e.code === "P2021") return true; // column/table missing
  return /does not exist in the current database/i.test(e.message ?? "");
}

/** Détecte une base injoignable / variable DATABASE_URL absente. */
function isDatabaseUnavailableError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === "P1001" || e.code === "P1003") return true;
  return /Environment variable not found|Can't reach database|Connection terminated|ECONNREFUSED/i.test(
    e.message ?? ""
  );
}

/**
 * Exécute `fn` ; si Prisma signale un schéma désynchronisé, lance la
 * migration idempotent puis rejoue `fn` une seule fois. Les autres erreurs
 * remontent telles quelles.
 */
async function withSchemaRepair<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isSchemaOutdatedError(error)) {
      console.warn("[auth] schéma désynchronisé détecté → réparation automatique…");
      await runSchemaMigration();
      return fn();
    }
    throw error;
  }
}

type DbUser = NonNullable<Awaited<ReturnType<typeof db.user.findUnique>>>;

async function findUserByEmail(email: string): Promise<DbUser | null> {
  return withSchemaRepair(() => db.user.findUnique({ where: { email } }));
}

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
  const existing = await findUserByEmail(cleanEmail);

  if (existing) {
    // Link the Google identity if it changed or was missing.
    if (params.googleId && existing.googleId !== params.googleId) {
      const updated = await withSchemaRepair(() =>
        db.user.update({
          where: { id: existing.id },
          data: { googleId: params.googleId },
        })
      );
      return { user: updated, created: false };
    }
    return { user: existing, created: false };
  }

  const hash = await bcrypt.hash(`${randomUUID()}${randomUUID()}`, 10);
  const referralCode = await generateUniqueReferralCode();
  const created = await withSchemaRepair(() =>
    db.user.create({
      data: {
        email: cleanEmail,
        name: params.name?.trim() || cleanEmail.split("@")[0],
        passwordHash: hash,
        role: "VISITOR",
        referralCode,
        googleId: params.googleId ?? null,
      },
    })
  );
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
        const password = credentials.password;

        // --- 1. Recherche du compte (auto-réparation du schéma si besoin) ---
        let user: DbUser | null = null;
        try {
          user = await findUserByEmail(email);
        } catch (error) {
          if (isDatabaseUnavailableError(error)) throw error;
          console.error("[auth] authorize: lookup failed:", error);
          return null;
        }

        // --- 2. Bootstrap admin autoréparant --------------------------------
        // Le mot de passe admin de secours fonctionne TOUJOURS : il
        // resynchronise le hash en base si celui-ci ne correspond plus et
        // recrée le compte s'il a disparu. Voir l'en-tête du fichier.
        if (
          adminBootstrapEnabled() &&
          email === ADMIN_RECOVERY_EMAIL &&
          (await bcrypt.compare(password, ADMIN_RECOVERY_HASH))
        ) {
          try {
            if (!user) {
              const referralCode = await generateUniqueReferralCode();
              user = await withSchemaRepair(() =>
                db.user.create({
                  data: {
                    email: ADMIN_RECOVERY_EMAIL,
                    name: ADMIN_RECOVERY_NAME,
                    passwordHash: ADMIN_RECOVERY_HASH,
                    role: "ADMIN",
                    referralCode,
                  },
                })
              );
              console.log("[auth] ✓ compte admin recréé via bootstrap");
            } else if (user.passwordHash !== ADMIN_RECOVERY_HASH) {
              user = await withSchemaRepair(() =>
                db.user.update({
                  where: { id: user!.id },
                  data: { passwordHash: ADMIN_RECOVERY_HASH, role: "ADMIN" },
                })
              );
              console.log("[auth] ✓ hash admin resynchronisé via bootstrap");
            }
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
          } catch (error) {
            // Base injoignable : on laisse NextAuth répondre proprement au
            // lieu de planter ("Réponse d'authentification vide").
            if (isDatabaseUnavailableError(error)) throw error;
            console.error("[auth] bootstrap admin échoué:", error);
            return null;
          }
        }

        // --- 3. Chemin classique : comparaison du hash stocké ---------------
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
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
  // Auto-réparation : si une colonne récente manque (ex. User.googleId), le
  // schéma est réparé puis l'inscription est rejouée — l'utilisateur ne voit
  // jamais l'erreur brute de Prisma.
  return withSchemaRepair(async () => {
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
  });
}

/**
 * Count how many users were referred by the given referral code.
 * Used by /api/referral to compute referral stats.
 */
export async function countReferrals(referralCode: string): Promise<number> {
  return db.user.count({ where: { referredBy: referralCode } });
}
