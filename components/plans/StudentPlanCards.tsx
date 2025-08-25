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
  // NEW: optional defaults passed from server (deck page). If missing, we'll fetch /api/self.
  defaultFullName,
  defaultEmail,
  defaultMobile,
}: {
  coachEmail: string;
  coachId: string;
  enableBank: boolean;
  enableEwallet: boolean;
  plans: Plan[];
  defaultFullName?: string;
  defaultEmail?: string;
  defaultMobile?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Plan | null>(null);

  // Prefill-able fields
  const [fullName, setFullName] = React.useState<string>(defaultFullName || "");
  const [email, setEmail] = React.useState<string>(defaultEmail || "");
  const [mobile, setMobile] = React.useState<string>(defaultMobile || "");
  const [loading, setLoading] = React.useState(false);

  // If defaults were not passed, try fetching from /api/self once on mount
  React.useEffect(() => {
    const needFetch =
      (!defaultFullName && !fullName) ||
      (!defaultEmail && !email) ||
      (!defaultMobile && !mobile);

    if (!needFetch) return;

    (async () => {
      try {
        const r = await fetch("/api/self", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (!fullName && j.name) setFullName(j.name);
        if (!email && j.email) setEmail(j.email);
        if (!mobile && j.phone) setMobile(j.phone);
      } catch {
        // ignore
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function start(plan: Plan) {
    setSelected(plan);
    setOpen(true);
  }

  async function proceed() {
    if (!selected) return;
    if (!fullName || !email) {
      (window as any).dispatchEvent(
        new CustomEvent("toast", {
          detail: { kind: "error", msg: "Please fill in name and email" },
        })
      );
      return;
    }
    setLoading(true);

    // Try external checkout first (optional integration)
    try {
      const attempt = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName: selected.name,
          firstName: fullName.split(" ")[0] || fullName,
          lastName: fullName.split(" ").slice(1).join(" ") || "-",
          email,
          mobile,
          amount: selected.amount,
          term: selected.type === "SUBSCRIPTION" ? "MONTHLY" : "ONE_TIME",
        }),
      });
      if (attempt.ok) {
        const j: any = await attempt.json().catch(() => null as any);
        if (j && j.payment_url) {
          window.location.href = String(j.payment_url);
          return;
        }
      }
    } catch {
      // ignore and fall back to invoice
    }

    // Fallback: create internal invoice and redirect to invoice page (with payment channels + proof upload)
    try {
      const r = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selected.id,
          buyerName: fullName,
          buyerEmail: email,
          buyerMobile: mobile,
        }),
      });
      setLoading(false);
      if (!r.ok) {
        (window as any).dispatchEvent(
          new CustomEvent("toast", {
            detail: { kind: "error", msg: "Could not create invoice" },
          })
        );
        return;
      }
      const j = await r.json();
      (window as any).dispatchEvent(
        new CustomEvent("toast", {
          detail: { kind: "success", msg: "Invoice created" },
        })
      );
      setOpen(false);
      window.location.href = "/payments/" + j.invoice.id;
    } catch {
      setLoading(false);
      (window as any).dispatchEvent(
        new CustomEvent("toast", {
          detail: { kind: "error", msg: "Something went wrong" },
        })
      );
    }
  }

  function fmtPrice(p: number, c: string) {
    const sym = c === "PHP" ? "₱" : "";
    try {
      return sym + new Intl.NumberFormat("en-PH").format(p) + " " + c;
    } catch {
      return sym + p.toLocaleString() + " " + c;
    }
  }

  return (
    <div className="relative">
      <div className="grid md:grid-cols-2 gap-3">
        {plans.map((p) => (
          <div key={p.id} className="border rounded-[3px] p-3 space-y-2">
            <div className="font-semibold">{p.name}</div>
            {p.description ? (
              <div className="muted text-sm">{p.description}</div>
            ) : null}
            <div className="text-lg font-bold">{fmtPrice(p.amount, p.currency)}</div>
            <div className="text-xs muted">
              {"Channels: " +
                (enableBank ? "Bank" : "") +
                (enableBank && enableEwallet ? " · " : "") +
                (enableEwallet ? "E-Wallet" : "")}
            </div>
            <button
              className="btn btn-primary"
              type="button"
              onClick={function () {
                start(p);
              }}
            >
              Select
            </button>
          </div>
        ))}
        {plans.length === 0 && (
          <div className="muted text-sm">No plans available.</div>
        )}
      </div>

      {/* Modal */}
      {open && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={function () {
              if (!loading) {
                setOpen(false);
              }
            }}
          />
          <div className="relative bg-white rounded-[3px] shadow-lg w-[95%] max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Proceed to Payment</div>
              <button
                className="btn"
                onClick={function () {
                  if (!loading) setOpen(false);
                }}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              <div className="muted text-sm">
                {selected.name} — {fmtPrice(selected.amount, selected.currency)}
              </div>
              <label className="label">
                Full Name
                <input
                  className="input"
                  value={fullName}
                  onChange={function (e) {
                    setFullName((e.target as HTMLInputElement).value);
                  }}
                  placeholder="Your full name"
                />
              </label>
              <label className="label">
                Email
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={function (e) {
                    setEmail((e.target as HTMLInputElement).value);
                  }}
                  placeholder="you@example.com"
                />
              </label>
              <label className="label">
                Mobile (e.g., +639XXXXXXXXX)
                <input
                  className="input"
                  value={mobile}
                  onChange={function (e) {
                    setMobile((e.target as HTMLInputElement).value);
                  }}
                  placeholder="+63917…"
                />
              </label>
              <button
                className="btn btn-primary w-full"
                disabled={loading}
                onClick={function () {
                  proceed();
                }}
                type="button"
              >
                {loading ? "Creating invoice…" : "Proceed to Payment"}
              </button>
              <div className="text-xs muted">
                You will be redirected to your invoice with payment instructions
                and an upload button for proof of payment.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
