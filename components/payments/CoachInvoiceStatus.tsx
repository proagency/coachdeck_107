"use client";
import React from "react";

export default function CoachInvoiceStatus({
  invoiceId,
  current,
}: {
  invoiceId: string;
  current: "PENDING"|"SUBMITTED"|"UNDER_REVIEW"|"PAID"|"REJECTED"|"CANCELED";
}) {
  const [status, setStatus] = React.useState(current);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    const r = await fetch("/api/invoices/" + invoiceId + "/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    if (r.ok) {
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "success", msg: "Status updated" } }));
      location.reload();
    } else {
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg: "Failed to update" } }));
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
        <option value="PENDING">PENDING</option>
        <option value="SUBMITTED">SUBMITTED</option>
        <option value="UNDER_REVIEW">UNDER_REVIEW</option>
        <option value="PAID">PAID</option>
        <option value="REJECTED">REJECTED</option>
        <option value="CANCELED">CANCELED</option>
      </select>
      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
