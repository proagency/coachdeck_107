"use client";
import React from "react";

type InvoiceLite = {
  id: string;
  title: string | null;
  amount: number;
  currency: string;
  status: "PENDING"|"SUBMITTED"|"UNDER_REVIEW"|"PAID"|"REJECTED"|"CANCELED";
  student: { email: string | null };
  plan?: { name?: string | null } | null;
};

export default function CoachInvoicesTable({ invoices }: { invoices: InvoiceLite[] }) {
  const [items, setItems] = React.useState<InvoiceLite[]>(invoices || []);

  async function setStatus(id: string, status: InvoiceLite["status"]) {
    const r = await fetch("/api/invoices/" + id + "/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      setItems(prev => prev.map(x => x.id === id ? { ...x, status: j?.invoice?.status || status } : x));
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "success", msg: "Status updated" } }));
    } else {
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg: "Failed to update" } }));
    }
  }

  return (
    <div className="grid gap-2">
      {items.map(inv => (
        <div key={inv.id} className="border rounded-[3px] p-3 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="font-medium">{inv.title || (inv.plan?.name || "Plan")}</div>
            <div className="text-sm muted">Student: {inv.student?.email || "—"}</div>
            <div className="text-sm">₱{(inv.amount || 0).toLocaleString()} {inv.currency}</div>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="input"
              value={inv.status}
              onChange={(e) => setStatus(inv.id, e.target.value as InvoiceLite["status"])}
            >
              <option value="PENDING">PENDING</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="PAID">PAID</option>
              <option value="REJECTED">REJECTED</option>
              <option value="CANCELED">CANCELED</option>
            </select>
            <a className="btn" href={"/coach/payments/" + inv.id} target="_blank" rel="noreferrer">Open</a>
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="muted text-sm">No invoices yet.</div>}
    </div>
  );
}
