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

export async function ensureAdminAccount() {
  const adminEmail = process.env.ADMIN_EMAIL || "giobamos03@gmail.com";
  const adminPassword = "Giov@12342005";
  const existing = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await db.user.create({
      data: { email: adminEmail, name: "Administrateur", passwordHash: hash, role: "ADMIN" },
    });
    console.log(`✓ Admin account created: ${adminEmail}`);
  }
}

export async function createVisitorAccount(email: string, name: string, password: string) {
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new Error("Un compte existe déjà avec cet email.");
  const hash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { email: email.toLowerCase(), name, passwordHash: hash, role: "VISITOR" },
  });
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
