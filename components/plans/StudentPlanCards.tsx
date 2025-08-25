"use client";
import React from "react";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  type: "ONE_TIME" | "SUBSCRIPTION";
  amount: number;
  currency: string;
};

export default function StudentPlanCards({
  coachEmail,
  coachId,
  enableBank,
  enableEwallet,
  plans,
}: {
  coachEmail: string;
  coachId: string;
  enableBank: boolean;
  enableEwallet: boolean;
  plans: Plan[];
}) {
  async function buy(plan: Plan) {
    // Try external checkout first
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName: plan.name,
          firstName: "",
          lastName: "",
          email: "",
          mobile: "",
          amount: plan.amount,
          term: plan.type === "SUBSCRIPTION" ? "MONTHLY" : "ONE_TIME",
        }),
      });
      if (r.ok) {
        const j: any = await r.json().catch(() => null as any);
        if (j && j.payment_url) {
          window.location.href = String(j.payment_url);
          return;
        }
      }
    } catch (_) {}

    // Fallback: create invoice (manual flow)
    const r2 = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id }),
    });
    if (r2.ok) {
      const j = await r2.json();
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "success", msg: "Invoice created" } }));
      window.location.href = "/payments/" + j.invoice.id;
    } else {
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg: "Could not start purchase" } }));
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-3">
      {plans.map((p) => (
        <div key={p.id} className="border rounded-[3px] p-3 space-y-2">
          <div className="font-semibold">{p.name}</div>
          {p.description ? <div className="muted text-sm">{p.description}</div> : null}
          <div className="text-lg font-bold">
            {(p.currency === "PHP" ? "₱" : "") + p.amount.toLocaleString() + " " + p.currency}
          </div>
          <div className="text-xs muted">
            {"Channels: " + (enableBank ? "Bank" : "") + (enableBank && enableEwallet ? " · " : "") + (enableEwallet ? "E-Wallet" : "")} 
          </div>
          <button className="btn btn-primary" type="button" onClick={function(){ buy(p); }}>
            Buy
          </button>
        </div>
      ))}
      {plans.length === 0 && <div className="muted text-sm">No plans available.</div>}
    </div>
  );
}
