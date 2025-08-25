"use client";
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
