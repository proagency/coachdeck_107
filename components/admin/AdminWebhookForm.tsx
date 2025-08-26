"use client";
import * as React from "react";

export default function AdminWebhookForm({ initial }: { initial: { externalPaymentWebhookUrl?: string | null } }) {
  const [url, setUrl] = React.useState(initial?.externalPaymentWebhookUrl || "");
  const [saving, setSaving] = React.useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalPaymentWebhookUrl: url.trim() || null }),
    });
    setSaving(false);
    if (r.ok) {
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Saved"}}));
    } else {
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Save failed"}}));
    }
  }

  return (
    <form className="space-y-2" onSubmit={onSave}>
      <label className="label">External Payment Webhook URL
        <input
          className="input"
          placeholder="https://example.com/payment-webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
    </form>
  );
}
