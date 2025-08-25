"use client";
import React from "react";

export default function AdminPlansForm({
  initial,
}: {
  initial: { currency: string; starterMonthly: number; starterYearly: number; proMonthly: number; proYearly: number };
}) {
  const [state, setState] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);

  function setNum(key: keyof typeof initial, v: string) {
    const n = parseInt(v || "0", 10);
    setState({ ...state, [key]: isNaN(n) ? 0 : n });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/admin/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    setSaving(false);
    if (r.ok) {
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "success", msg: "Saved" } }));
    } else {
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg: "Save failed" } }));
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSave}>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="label">
          Currency (ISO)
          <input
            className="input"
            value={state.currency}
            onChange={e => setState({ ...state, currency: e.target.value })}
            placeholder="PHP"
          />
        </label>
        <div />
        <label className="label">
          Starter Monthly (integer)
          <input
            className="input"
            type="number"
            value={state.starterMonthly}
            onChange={e => setNum("starterMonthly", e.target.value)}
          />
        </label>
        <label className="label">
          Starter Yearly (integer)
          <input
            className="input"
            type="number"
            value={state.starterYearly}
            onChange={e => setNum("starterYearly", e.target.value)}
          />
        </label>
        <label className="label">
          Pro Monthly (integer)
          <input
            className="input"
            type="number"
            value={state.proMonthly}
            onChange={e => setNum("proMonthly", e.target.value)}
          />
        </label>
        <label className="label">
          Pro Yearly (integer)
          <input
            className="input"
            type="number"
            value={state.proYearly}
            onChange={e => setNum("proYearly", e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center justify-end">
        <button className="btn btn-primary" disabled={saving} type="submit">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
