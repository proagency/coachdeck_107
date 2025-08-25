"use client";
import React from "react";

export default function ResetPasswordForm({ token, initialEmail }: { token: string; initialEmail: string }) {
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (r.ok) {
      window.dispatchEvent(new CustomEvent("toast", { detail: { kind: "success", msg: "Password updated" } }));
      const u = new URL("/signin", window.location.origin);
      if (initialEmail) u.searchParams.set("email", initialEmail);
      window.location.href = u.toString();
    } else {
      const j = await r.json().catch(() => ({}));
      window.dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg: j.error || "Reset failed" } }));
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <form onSubmit={onSubmit} className="space-y-3 card">
        <label className="label">New Password
          <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        </label>
        <button className="btn btn-primary" disabled={loading}>{loading ? "Saving…" : "Save New Password"}</button>
      </form>
    </div>
  );
}
      