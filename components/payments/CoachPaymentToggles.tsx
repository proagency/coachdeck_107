"use client";
import React from "react";

export default function CoachPaymentToggles({ initial }: { initial: { enableBank: boolean; enableEwallet: boolean } }) {
  const [enableBank, setEnableBank] = React.useState(!!initial.enableBank);
  const [enableEwallet, setEnableEwallet] = React.useState(!!initial.enableEwallet);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    const r = await fetch("/api/coach/payments/toggles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enableBank, enableEwallet }),
    });
    setSaving(false);
    (window as any).dispatchEvent(new CustomEvent("toast", {
      detail: { kind: r.ok ? "success" : "error", msg: r.ok ? "Saved" : "Failed to save" }
    }));
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={enableBank} onChange={(e)=>setEnableBank(e.target.checked)} />
        <span>Enable Bank Transfer</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={enableEwallet} onChange={(e)=>setEnableEwallet(e.target.checked)} />
        <span>Enable E-Wallet</span>
      </label>
      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
