// patch.mjs
// - Fix Credentials sign-in (NextAuth JWT + bcrypt check)
// - Overwrite Sign-in page to use signIn('credentials')
// - Ensure "Create account" link is shown on Sign-in card
// Run: node patch.mjs

import fs from "fs";
import path from "path";

const cwd = process.cwd();
const join = (...p) => path.join(cwd, ...p);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function writeFile(rel, content) {
  const full = join(rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content, "utf8");
  console.log("✓ wrote", rel);
}

// 1) NextAuth credentials config (JWT strategy + bcrypt password check)
writeFile(
  "lib/auth.ts",
  `import type { NextAuthOptions } from "next-auth";
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
`
);

// 2) Ensure NextAuth route is wired to authOptions
writeFile(
  "app/api/auth/[...nextauth]/route.ts",
  `import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
`
);

// 3) Overwrite Sign-in page to use signIn('credentials') and include "Create account" link
writeFile(
  "app/(auth)/signin/page.tsx",
  `"use client";
import React from "react";
import { signIn } from "next-auth/react";

export const metadata = { title: "Sign in — CoachDeck" };

export default function SignInPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/decks",
    });
    setLoading(false);
    if (res?.error) {
      (window as any).dispatchEvent(new CustomEvent("toast",{ detail:{ kind:"error", msg:"Invalid email or password" }}));
      return;
    }
    // success
    (window as any).dispatchEvent(new CustomEvent("toast",{ detail:{ kind:"success", msg:"Signed in" }}));
    window.location.href = "/decks";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-center">Sign in</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="label">Email
          <input className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required placeholder="you@example.com" />
        </label>
        <label className="label">Password
          <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        </label>
        <button className="btn btn-primary w-full" disabled={loading} type="submit">
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <div className="text-center text-sm">
          <a className="underline" href="/forgot">Forgot password?</a>
        </div>
        <div className="text-center text-sm">
          {/* 👉 Create Account link */}
          <a className="underline" href="/signup">Create an account</a>
        </div>
      </form>
    </div>
  );
}
`
);

console.log("All done. Now restart: pnpm dev");
