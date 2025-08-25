import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import * as bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  // IMPORTANT: credentials requires JWT strategy (no DB sessions)
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email || "").toString().trim().toLowerCase();
        const password = (credentials?.password || "").toString();

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            accessLevel: true,
            status: true,
            passwordHash: true, // make sure this column exists in your schema
          },
        });

        if (!user) return null;
        if (user.status && user.status !== "ACTIVE") return null;

        const ok = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
        if (!ok) return null;

        // Return minimal user object for JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          accessLevel: user.accessLevel,
          isSuperAdmin: user.role === "SUPER_ADMIN",
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.accessLevel = (user as any).accessLevel;
        token.phone = (user as any).phone || null;
        token.isSuperAdmin = (user as any).isSuperAdmin || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).accessLevel = token.accessLevel;
        (session.user as any).phone = token.phone || null;
        (session.user as any).isSuperAdmin = token.isSuperAdmin || false;
      }
      return session;
    },
  },
};
