"use client";
import React from "react";

export default function ForgotForm() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Prefill from ?email=… if present
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const e = url.searchParams.get("email");
      if (e) setEmail(e);
    } catch {}
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg: "Email is required" }}));
      return;
    }
    setLoading(true);
    const r = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);

    if (r.ok) {
      (window as any).dispatchEvent(new CustomEvent("toast", {
        detail: { kind: "success", msg: "If that email exists, we sent a reset link." }
      }));
    } else {
      let msg = "Request failed";
      try { const j = await r.json(); if (j?.error) msg = String(j.error); } catch {}
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg }}));
    }
  }

  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <label className="label">
        Email
        <input
          className="input"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>
      <div className="flex items-center justify-end gap-2">
        <button className="btn" type="reset" onClick={() => setEmail("")}>Clear</button>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </div>
    </form>
  );
}
