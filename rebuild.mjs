// patch.mjs
// CoachDeck build 107 – role-aware tweaks + layouts + booking modal + profile simplification.
// Run: node patch.mjs

import fs from "fs";
import path from "path";
const root = process.cwd();
const join = (...p) => path.join(root, ...p);
function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function write(file, content){ const f=join(file); ensureDir(path.dirname(f)); fs.writeFileSync(f, content, "utf8"); console.log("✓ wrote", file); }
function exists(file){ return fs.existsSync(join(file)); }

/* 1) Keep sidebar on /coach/*, /plans/*, /payments/* by giving them a dashboard-like layout */
const DASH_SHELL = `import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSidebarLinks } from "@/lib/nav";

export default async function SectionLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user ? {
    role: (session.user as any).role as any,
    isSuperAdmin: Boolean((session.user as any).isSuperAdmin),
  } : null;
  const links = getSidebarLinks(user);

  return (
    <main className="mx-auto max-w-7xl p-6 grid grid-cols-12 gap-4">
      <aside className="col-span-12 md:col-span-4 lg:col-span-3">
        <div className="card space-y-2">
          <nav className="space-y-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="btn w-full justify-start">{l.label}</Link>
            ))}
          </nav>
        </div>
        <div className="card mt-4">
          {session?.user ? (
            <div className="space-y-2">
              <div className="text-sm">Signed in as <span className="font-medium">{session.user.email}</span></div>
              <form action="/api/auth/signout" method="post">
                <button className="btn w-full">Sign out</button>
              </form>
            </div>
          ) : (
            <form action="/api/auth/signin" method="get" className="space-y-3">
              <div className="label">Login / Create account</div>
              <button className="btn w-full" type="submit">Go to Sign in</button>
            </form>
          )}
        </div>
      </aside>
      <section className="col-span-12 md:col-span-8 lg:col-span-9">{children}</section>
    </main>
  );
}
`;

write("app/coach/layout.tsx", DASH_SHELL);
write("app/plans/layout.tsx", DASH_SHELL);
write("app/payments/layout.tsx", DASH_SHELL);

/* 2) Profile page – show only Email; Coach: add placeholder for External Payment Webhook */
write("app/(dashboard)/profile/page.tsx", `import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Your Profile" };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return null;

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });
  if (!me) return null;

  const isCoach = me.role === "COACH";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <div className="card grid gap-3">
        <label className="label">Email
          <input className="input" value={me.email} readOnly />
        </label>
      </div>

      {isCoach && (
        <div className="card grid gap-3">
          <div className="font-medium">External Payment Webhook</div>
          <input className="input" placeholder="https://your-webhook.example.com — (placeholder, not yet active)" readOnly />
          <div className="text-xs muted">This is a placeholder field for a future integration. No changes are saved yet.</div>
        </div>
      )}
    </div>
  );
}
`);

/* 3) Booking modal component (client) */
write("components/BookingModal.tsx", `"use client";
import React from "react";

export default function BookingModal({ url }: { url: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={()=>setOpen(true)}>Book Appointment</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={()=>setOpen(false)}>
          <div className="bg-white rounded-[3px] shadow-lg w-full max-w-3xl h-[70vh] overflow-hidden" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="font-medium">Book an Appointment</div>
              <button className="btn" onClick={()=>setOpen(false)}>Close</button>
            </div>
            <div className="w-full h-full">
              <iframe src={url} title="Booking" className="w-full h-full" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
`);

/* 4) Deck detail – add booking button for student (if coach has bookingUrl).
      Also keep ticket/doc logic intact and add a tiny back link above lists. */
write("app/(dashboard)/decks/[id]/page.tsx", `import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { TicketActions } from "@/components/deck/TicketActions";
import BookingModal from "@/components/BookingModal";

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

  // Pull coach payments config to show booking link (if configured)
  const coachCfg = await prisma.coachPaymentsConfig.findUnique({ where: { coachId: deck.coachId } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{deck.name}</h1>
        <a className="btn" href="/decks">Back</a>
      </div>

      {/* Who’s who + quick create ticket for student */}
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

        {/* Docs + Progress + Booking */}
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
        </div>
      </div>
    </div>
  );
}
`);

/* 5) Backlinks in tables/views */

// 5a) Coach Invoices Table
write("components/payments/CoachInvoicesTable.tsx", `"use client";
import React from "react";

export default function CoachInvoicesTable({ invoices }: any) {
  const [items, setItems] = React.useState(invoices || []);

  async function setStatus(id: string, status: string){
    const r = await fetch("/api/invoices/" + id + "/status", {
      method:"PATCH",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ status })
    });
    if (r.ok){
      const j = await r.json();
      setItems((prev:any[])=>prev.map(x=>x.id===id?{...x,status:j.invoice.status}:x));
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Status updated"}}));
    } else {
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed"}}));
    }
  }

  return (
    <div className="grid gap-3">
      <div className="text-right">
        <button className="btn" onClick={()=>history.back()}>‹ Back</button>
      </div>
      {items.map((inv:any) => (
        <div key={inv.id} className="border rounded-[3px] p-3 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="font-medium">{inv.title || (inv.plan?.name || "Plan")}</div>
            <div className="text-sm muted">Student: {inv.student.email} • Plan: {inv.plan?.name ?? "—"}</div>
            <div className="text-sm">₱{(inv.amount || 0).toLocaleString()} {inv.currency}</div>
          </div>
          <div className="flex items-center gap-2">
            <select className="input" value={inv.status} onChange={(e)=>setStatus(inv.id, e.target.value)}>
              <option>PENDING</option><option>SUBMITTED</option><option>UNDER_REVIEW</option><option>PAID</option><option>REJECTED</option><option>CANCELED</option>
            </select>
            <a className="btn" href={"/payments/"+inv.id} target="_blank">Open</a>
          </div>
        </div>
      ))}
      {items.length===0 && <div className="muted text-sm">No invoices yet.</div>}
    </div>
  );
}
`);

// 5b) Student payments list: add back link at top (only if file exists)
if (exists("app/payments/page.tsx")) {
  write("app/payments/page.tsx", `import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "STUDENT") return notFound();

  const invoices = await prisma.invoice.findMany({
    where: { studentId: me.id },
    include: { plan: true, coach: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payments</h1>
        <button className="btn" onClick={()=>history.back()}>‹ Back</button>
      </div>

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
  );
}
`);
}

// 5c) Student payment detail page: add back link (only if file exists)
if (exists("app/payments/[id]/page.tsx")) {
  const detail = `import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import ProofUploadForm from "@/components/payments/ProofUploadForm";

export default async function PaymentDetail({ params }: { params: Promise<{ id: string }> }) {
  const p = await params; const id = p.id;

  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "STUDENT") return notFound();

  const inv = await prisma.invoice.findFirst({
    where: { id, studentId: me.id },
    include: { plan: { include: { coach: true } }, coach: true },
  });
  if (!inv) return notFound();

  const banks = await prisma.coachBankAccount.findMany({ where: { coachId: inv.coachId } });
  const wallets = await prisma.coachEwallet.findMany({ where: { coachId: inv.coachId } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoice</h1>
        <button className="btn" onClick={()=>history.back()}>‹ Back</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <div className="font-medium">{inv.title || (inv.plan?.name || "Plan")}</div>
          <div className="muted text-sm">Coach: {inv.coach?.email}</div>
          <div className="text-sm">Amount Due: ₱{(inv.amount || 0).toLocaleString()} {inv.currency}</div>
          <div className="text-sm">Status: {inv.status}</div>
        </div>

        <div className="card space-y-3">
          <div className="font-medium">Payment Channels</div>
          <div className="card">
            <div className="font-medium mb-2">Bank Transfer</div>
            {banks.length === 0 ? <div className="muted text-sm">No bank channels available.</div> : (
              <ul className="text-sm list-disc ml-4">
                {banks.map(b => (<li key={b.id}><span className="font-medium">{b.bankName}</span> — {b.accountName} ({b.accountNumber}) {b.branch ? "• " + b.branch : ""}</li>))}
              </ul>
            )}
          </div>
          <div className="card">
            <div className="font-medium mb-2">E-Wallets</div>
            {wallets.length === 0 ? <div className="muted text-sm">No e-wallet channels available.</div> : (
              <ul className="text-sm list-disc ml-4">
                {wallets.map(w => (<li key={w.id}><span className="font-medium">{w.provider}</span> — {w.handle}</li>))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ProofUploadForm invoiceId={inv.id} />
    </div>
  );
}
`;
  write("app/payments/[id]/page.tsx", detail);
}

console.log("All done. Restart your dev server (pnpm dev).");
