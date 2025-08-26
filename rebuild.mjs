// patch.mjs
// Adds in-place plan purchase for students on /decks/[id] and /payments
// - components/payments/SelectPlanModal.tsx (client)
// - app/(dashboard)/decks/[id]/page.tsx (adds "Available Plans" for student)
// - app/payments/page.tsx (adds "Choose a Plan" for student)
//
// Usage: node patch.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const join = (...p) => path.join(root, ...p);
const ensure = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
const write = (rel, s) => { const f = join(rel); ensure(path.dirname(f)); fs.writeFileSync(f, s, "utf8"); console.log("✓ wrote", rel); };
const exists = (rel) => fs.existsSync(join(rel));

/* 1) SelectPlanModal (client) */
write(
  "components/payments/SelectPlanModal.tsx",
  `"use client";
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
`
);

/* 2) Deck detail – add "Available Plans" card for student */
write(
  "app/(dashboard)/decks/[id]/page.tsx",
  `import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import TicketActions from "@/components/deck/TicketActions";
import BookingModal from "@/components/BookingModal";
import SelectPlanModal from "@/components/payments/SelectPlanModal";

export default async function DeckDetail({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const id = p.id;

  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return notFound();

  const deck = await prisma.deck.findFirst({
    where: { id, OR: [{ coachId: me.id }, { membership: { studentId: me.id } }] },
    include: {
      coach: true,
      membership: { include: { student: true } },
      documents: true,
      progress: { orderBy: { weekStart: "desc" }, take: 4 },
      tickets: {
        orderBy: { createdAt: "desc" },
        include: { comments: { orderBy: { createdAt: "asc" } }, author: true },
      },
    },
  });
  if (!deck) return notFound();

  const isStudent = deck.membership?.studentId === me.id;
  const canUpdateStatus = deck.coachId === me.id || Boolean((session?.user as any)?.accessLevel === "ADMIN");

  // Coach config (for booking)
  const coachCfg = await prisma.coachPaymentsConfig.findUnique({ where: { coachId: deck.coachId } });

  // Coach active plans (for student)
  const plans = isStudent
    ? await prisma.paymentPlan.findMany({
        where: { coachId: deck.coachId, active: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{deck.name}</h1>
        <a className="btn" href="/decks">Back</a>
      </div>

      {/* Who’s who + Create Ticket (student only) */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="font-medium">Coach</div>
          <div className="muted">{deck.coach.email}</div>
        </div>
        <div className="card">
          <div className="font-medium">Student</div>
          <div className="muted">{deck.membership?.student?.email ?? "No student yet"}</div>
        </div>
        {isStudent && (
          <div className="card">
            <div className="font-medium">Create Ticket</div>
            <form className="space-y-2" method="post" action="/api/tickets">
              <input type="hidden" name="deckId" value={deck.id} />
              <input className="input" name="title" placeholder="Title" required />
              <textarea className="input" name="body" placeholder="Describe the issue…" required />
              <button className="btn btn-primary">Create</button>
            </form>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Tickets */}
        <div className="md:col-span-2 card">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Tickets</div>
            <a href="/tickets" className="text-sm underline">Back to tickets</a>
          </div>
          <ul className="space-y-3">
            {deck.tickets.map((t) => (
              <li key={t.id} className="border rounded-[3px] p-3">
                <div className="font-medium">{t.title}</div>
                <div className="text-sm muted">{t.body}</div>
                <div className="text-xs mt-1 muted">by {t.author.email} — {t.status}</div>
                <ul className="mt-2 text-sm space-y-1">
                  {t.comments.map((c) => (<li key={c.id} className="muted">↳ {c.body}</li>))}
                </ul>
                <TicketActions ticketId={t.id} current={t.status as any} canUpdateStatus={canUpdateStatus} />
              </li>
            ))}
            {deck.tickets.length === 0 && <li className="muted text-sm">No tickets yet.</li>}
          </ul>
        </div>

        {/* Right column: Docs, Progress, Booking, Plans */}
        <div className="space-y-4">
          <div className="card">
            <div className="font-medium mb-2">Documents</div>
            <ul className="text-sm list-disc ml-4 mt-2">
              {deck.documents.map((d) => (
                <li key={d.id}>{d.url ? <a className="underline" href={d.url} target="_blank">{d.title}</a> : d.title}</li>
              ))}
            </ul>
            {deck.documents.length === 0 && <div className="muted text-sm">No documents yet.</div>}
          </div>

          <div className="card">
            <div className="font-medium mb-2">Recent Progress</div>
            <ul className="text-sm list-disc ml-4">
              {deck.progress.map((p) => (<li key={p.id}>{new Date(p.weekStart).toDateString()} — {p.summary}</li>))}
            </ul>
            {deck.progress.length === 0 && <div className="muted text-sm">No progress entries yet.</div>}
          </div>

          {/* Booking button for students if coach configured bookingUrl */}
          {isStudent && (coachCfg as any)?.bookingUrl ? (
            <div className="card">
              <div className="font-medium mb-2">Book an appointment</div>
              <BookingModal url={(coachCfg as any).bookingUrl} />
            </div>
          ) : null}

          {/* Available Plans for students */}
          {isStudent && plans.length > 0 && (
            <div className="card space-y-3">
              <div className="font-medium">Available Plans</div>
              <ul className="grid gap-2">
                {plans.map((pl) => (
                  <li key={pl.id} className="border rounded-[3px] p-3">
                    <div className="font-semibold">{pl.name}</div>
                    {pl.description ? <div className="text-sm muted">{pl.description}</div> : null}
                    <div className="text-sm mt-1">₱{pl.amount.toLocaleString()} {pl.currency}</div>
                    <div className="mt-2">
                      <SelectPlanModal
                        plan={{ id: pl.id, name: pl.name, description: pl.description || "", amount: pl.amount, currency: pl.currency }}
                        student={{ fullName: me.name || "", email: me.email || "", mobile: (me as any).phone || "" }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`
);

/* 3) Student Payments page – add "Choose a Plan" section */
if (exists("app/payments/page.tsx")) {
  write(
    "app/payments/page.tsx",
    `import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import SelectPlanModal from "@/components/payments/SelectPlanModal";

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "STUDENT") return notFound();

  // Student's deck (1:1), latest
  const deck = await prisma.deck.findFirst({
    where: { membership: { studentId: me.id } },
    orderBy: { createdAt: "desc" },
    include: { coach: true },
  });

  const plans = deck
    ? await prisma.paymentPlan.findMany({
        where: { coachId: deck.coachId, active: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const invoices = await prisma.invoice.findMany({
    where: { studentId: me.id },
    include: { plan: true, coach: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payments</h1>
        <Link href="/decks" className="btn">‹ Back</Link>
      </div>

      {/* Choose a Plan */}
      {plans.length > 0 && (
        <div className="card space-y-3">
          <div className="font-medium">Choose a Plan</div>
          <div className="grid md:grid-cols-2 gap-3">
            {plans.map((pl) => (
              <div key={pl.id} className="border rounded-[3px] p-3">
                <div className="font-semibold">{pl.name}</div>
                {pl.description ? <div className="text-sm muted">{pl.description}</div> : null}
                <div className="text-sm mt-1">₱{pl.amount.toLocaleString()} {pl.currency}</div>
                <div className="mt-2">
                  <SelectPlanModal
                    plan={{ id: pl.id, name: pl.name, description: pl.description || "", amount: pl.amount, currency: pl.currency }}
                    student={{ fullName: me.name || "", email: me.email || "", mobile: (me as any).phone || "" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Invoices */}
      <div className="space-y-3">
        <div className="font-medium">Your Invoices</div>
        <div className="grid gap-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="border rounded-[3px] p-3 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="font-medium">{inv.title || (inv.plan?.name || "Plan")}</div>
                <div className="text-sm muted">Coach: {inv.coach?.email}</div>
                <div className="text-sm">₱{(inv.amount || 0).toLocaleString()} {inv.currency} • {inv.status}</div>
              </div>
              <div className="text-right">
                <Link href={"/payments/" + inv.id} className="btn btn-primary">View / Pay</Link>
              </div>
            </div>
          ))}
          {invoices.length === 0 && <div className="muted text-sm">No invoices yet.</div>}
        </div>
      </div>
    </div>
  );
}
`
  );
} else {
  console.log("! Skipped: app/payments/page.tsx not found");
}

console.log("All done. Restart your dev server (pnpm dev).");
