"use client";
import React from "react";

export default function SignupForm() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      (window as any).dispatchEvent(new CustomEvent("toast",{ detail:{ kind:"error", msg:"Email and password are required" }}));
      return;
    }
    if (password !== confirm) {
      (window as any).dispatchEvent(new CustomEvent("toast",{ detail:{ kind:"error", msg:"Passwords do not match" }}));
      return;
    }

    setLoading(true);
    const body = {
      name: name || null,
      email: email,
      phone: phone || null,
      password: password,
      role: "COACH",        // UI sign-up is COACH-only per requirements
    };

    const r = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (r.ok) {
      (window as any).dispatchEvent(new CustomEvent("toast", {
        detail: {
          kind: "success",
          msg: "Account request submitted. You’ll be notified after Super Admin approval.",
        },
      }));
      // clear form but do NOT redirect (per your rule: show toast instead)
      setName(""); setEmail(""); setPhone(""); setPassword(""); setConfirm("");
    } else {
      let msg = "Sign up failed";
      try {
        const j = await r.json();
        if (j && j.error) msg = String(j.error);
      } catch {}
      (window as any).dispatchEvent(new CustomEvent("toast", { detail:{ kind:"error", msg } }));
    }
  }

  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <label className="label">
        Full Name
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Jane Coach"
        />
      </label>

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

      <label className="label">
        Phone
        <input
          className="input"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+63917XXXXXXX"
        />
      </label>

      <label className="label">
        Password
        <input
          className="input"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </label>

      <label className="label">
        Confirm Password
        <input
          className="input"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••"
          required
        />
      </label>

      <div className="text-xs muted -mt-1">
        By signing up, your account will be set to <span className="font-medium">PENDING</span> until a Super Admin approves it.
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button className="btn" type="reset" onClick={() => { setName(""); setEmail(""); setPhone(""); setPassword(""); setConfirm(""); }}>
          Clear
        </button>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Submitting…" : "Create Account"}
        </button>
      </div>
    </form>
  );
}
