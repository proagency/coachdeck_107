// patch.mjs
// Rework coach payments page + adjust dashboard sidebar link + smooth scroll CSS.
// Run: node patch.mjs

import fs from "fs";
import path from "path";

const cwd = process.cwd();
const join = (...p) => path.join(cwd, ...p);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function writeFile(rel, content) {
  const full = join(rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content, "utf8");
  console.log("✓ wrote", rel);
}
function upsertInFile(rel, insert) {
  const full = join(rel);
  const src = fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
  if (src.includes(insert.trim())) return false;
  const next = src + "\n" + insert + "\n";
  fs.writeFileSync(full, next, "utf8");
  console.log("✓ updated", rel);
  return true;
}

/* 1) Sidebar link: point Payments → /coach/payments */
writeFile(
  "app/(dashboard)/layout.tsx",
  `import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl p-4 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg">CoachDeck</Link>
          <div />
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6 grid grid-cols-12 gap-4">
        <aside className="col-span-12 md:col-span-4 lg:col-span-3">
          <div className="card space-y-2">
            <nav className="space-y-1">
              <a className="btn w-full justify-start" href="/decks">Dashboard</a>
              <a className="btn w-full justify-start" href="/tickets">Tickets</a>
              <a className="btn w-full justify-start" href="/coach/payments">Payments</a>
              <a className="btn w-full justify-start" href="/plans">Plans</a>
              <a className="btn w-full justify-start" href="/profile">Profile</a>
              {(session?.user as any)?.isSuperAdmin ? (
                <a className="btn w-full justify-start" href="/admin/plans">Plan Config</a>
              ) : null}
              {(session?.user as any)?.isSuperAdmin ? (
                <a className="btn w-full justify-start" href="/approvals">Approvals</a>
              ) : null}
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

        <section className="col-span-12 md:col-span-8 lg:col-span-9">
          {children}
        </section>
      </main>
    </div>
  );
}
`
);

/* 2) Smooth scrolling CSS */
upsertInFile(
  "styles/globals.css",
  `html { scroll-behavior: smooth; }`
);

/* 3) A tiny client toggles component for Bank/E-Wallet */
writeFile(
  "components/payments/CoachPaymentToggles.tsx",
  `"use client";
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
`
);

/* 4) API route to persist toggles */
writeFile(
  "app/api/coach/payments/toggles/route.ts",
  `import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || (me.role !== "COACH" && (session?.user as any)?.accessLevel !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { enableBank, enableEwallet } = await req.json().catch(()=>({}));
  const cfg = await prisma.coachPaymentsConfig.upsert({
    where: { coachId: me.id },
    update: {
      enableBank: !!enableBank,
      enableEwallet: !!enableEwallet,
    },
    create: {
      coachId: me.id,
      enableBank: !!enableBank,
      enableEwallet: !!enableEwallet,
    },
  });

  return NextResponse.json({ ok: true, config: cfg });
}
`
);

/* 5) Rework /coach/payments page UI */
writeFile(
  "app/coach/payments/page.tsx",
  `import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import CoachPaymentToggles from "@/components/payments/CoachPaymentToggles";
import CoachBankAccounts from "@/components/payments/CoachBankAccounts";
import CoachEwallets from "@/components/payments/CoachEwallets";
import CoachPlansForm from "@/components/payments/CoachPlansForm";
import CoachInvoicesTable from "@/components/payments/CoachInvoicesTable";

export default async function CoachPaymentsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email } });
  const isCoach = !!me && me.role === "COACH";
  const isAdmin = !!(session?.user as any)?.accessLevel && (session?.user as any).accessLevel === "ADMIN";
  if (!me || (!isCoach && !isAdmin)) return notFound();

  // Upsert config to guarantee presence
  const cfg = await prisma.coachPaymentsConfig.upsert({
    where: { coachId: me.id },
    update: {},
    create: { coachId: me.id },
  });

  const banks = await prisma.coachBankAccount.findMany({
    where: { coachId: me.id },
    orderBy: { createdAt: "desc" },
  });
  const wallets = await prisma.coachEwallet.findMany({
    where: { coachId: me.id },
    orderBy: { createdAt: "desc" },
  });
  const plans = await prisma.paymentPlan.findMany({
    where: { coachId: me.id },
    orderBy: { createdAt: "desc" },
  });
  const invoices = await prisma.invoice.findMany({
    where: { coachId: me.id },
    include: { student: true, plan: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="relative">
      {/* Local header with brand top-left */}
      <div className="border-b bg-white mb-4 -mt-6 -mx-6 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="font-semibold text-lg">CoachDeck</div>
        </div>
      </div>

      {/* Floating anchor links (md+). Left margin on content to avoid overlap */}
      <nav
        className="hidden md:block fixed left-6 top-28 z-10 w-44 p-2 bg-white/90 backdrop-blur border rounded-[3px] shadow-sm space-y-2"
        aria-label="Section links"
      >
        <a href="#toggles" className="btn w-full justify-start">Payment Toggles</a>
        <a href="#banks" className="btn w-full justify-start">Bank Accounts</a>
        <a href="#wallets" className="btn w-full justify-start">E-Wallets</a>
        <a href="#plans" className="btn w-full justify-start">Plans</a>
        <a href="#invoices" className="btn w-full justify-start">Invoices</a>
      </nav>

      <div className="md:pl-56 space-y-6">
        <h1 className="text-2xl font-semibold">Payments</h1>

        <section id="toggles" className="card space-y-3 scroll-mt-24">
          <div className="font-medium">Payment Toggles</div>
          <CoachPaymentToggles initial={{ enableBank: cfg.enableBank, enableEwallet: cfg.enableEwallet }} />
          <div className="text-xs muted">Turn on the channels you accept. These options appear on student invoices.</div>
        </section>

        <section id="banks" className="card space-y-3 scroll-mt-24">
          <div className="font-medium">Bank Accounts</div>
          <CoachBankAccounts initial={banks} />
          <div className="text-xs muted">Add up to 5 bank channels.</div>
        </section>

        <section id="wallets" className="card space-y-3 scroll-mt-24">
          <div className="font-medium">E-Wallets</div>
          <CoachEwallets initial={wallets} />
          <div className="text-xs muted">Add up to 5 e-wallet channels.</div>
        </section>

        <section id="plans" className="card space-y-3 scroll-mt-24">
          <div className="font-medium">Plans</div>
          <CoachPlansForm initial={plans} />
        </section>

        <section id="invoices" className="card space-y-3 scroll-mt-24">
          <div className="font-medium">Invoices</div>
          <CoachInvoicesTable invoices={invoices} />
        </section>
      </div>
    </div>
  );
}
`
);

console.log("All done. Restart dev with `pnpm dev`.");
