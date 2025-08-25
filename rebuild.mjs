// patch.mjs
// Fixes: "You are attempting to export metadata from a component marked with use client"
// by splitting Sign In into a server page (owns `metadata`) + client form component.

import fs from "fs";
import path from "path";

const cwd = process.cwd();
const join = (...p) => path.join(cwd, ...p);
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function writeFile(rel, content) {
  const full = join(rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content, "utf8");
  console.log("✓ wrote", rel);
}

// 1) Client component with form + signIn('credentials')
writeFile(
  "components/auth/SignInForm.tsx",
  `"use client";
import React from "react";
import { signIn } from "next-auth/react";

export default function SignInForm() {
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
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg: "Invalid email or password" } }));
      return;
    }
    (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "success", msg: "Signed in" } }));
    window.location.href = "/decks";
  }

  return (
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
        {/* Create account link */}
        <a className="underline" href="/signup">Create an account</a>
      </div>
    </form>
  );
}
`
);

// 2) Server page that owns metadata and renders the client form
writeFile(
  "app/(auth)/signin/page.tsx",
  `import SignInForm from "@/components/auth/SignInForm";

export const metadata = { title: "Sign in — CoachDeck" };

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-center">Sign in</h1>
      <SignInForm />
    </div>
  );
}
`
);

console.log("All done. Restart dev: pnpm dev");
