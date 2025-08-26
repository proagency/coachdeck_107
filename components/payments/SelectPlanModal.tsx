"use client";
import React from "react";

type Plan = { id: string; name: string; description?: string | null; amount: number; currency: string; };

export default function SelectPlanModal({
  plan,
  student,
}: {
  plan: Plan;
  student: { fullName?: string | null; email?: string | null; mobile?: string | null };
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [fullName, setFullName] = React.useState<string>(student.fullName || "");
  const [email, setEmail] = React.useState<string>(student.email || "");
  const [mobile, setMobile] = React.useState<string>(student.mobile || "");

  async function proceed() {
    try {
      setLoading(true);
      // Create invoice. We include extra fields; API may ignore them.
      const r = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          fullName,
          email,
          mobile,
          // Some installs require channel; default to BANK if needed.
          channel: "BANK",
        }),
      });
      const j = await r.json().catch(() => ({} as any));
      setLoading(false);
      if (!r.ok) {
        (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg: j?.error || "Failed to create invoice" } }));
        return;
      }
      // Support multiple shapes
      const invoiceId = j?.invoice?.id || j?.id || j?.invoiceId || null;
      const paymentUrl = j?.payment_url || null;

      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "success", msg: "Invoice created" } }));

      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else if (invoiceId) {
        window.location.href = "/payments/" + invoiceId;
      } else {
        // Fallback: go to payments list
        window.location.href = "/payments";
      }
    } catch (e) {
      setLoading(false);
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg: "Network error" } }));
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>Select Plan</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-[3px] shadow-lg w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="font-medium">Proceed to Payment</div>
              <button className="btn" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="muted text-sm">Plan: <span className="font-medium">{plan.name}</span> • Amount: ₱{plan.amount.toLocaleString()} {plan.currency}</div>
              <label className="label">Full Name
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" />
              </label>
              <label className="label">Email
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </label>
              <label className="label">Mobile (e164, PH)
                <input className="input" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+639171234567" />
              </label>
              <div className="pt-2">
                <button className="btn btn-primary" onClick={proceed} disabled={loading}>
                  {loading ? "Creating invoice…" : "Proceed to Payment"}
                </button>
              </div>
              <div className="text-xs muted">After creating the invoice, you’ll be redirected to the invoice page with payment instructions and proof upload.</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
