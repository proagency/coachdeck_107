// patch.mjs
// Coach payment verification flow:
// - components/payments/CoachInvoicesTable.tsx (client): list + status update + open link
// - components/payments/CoachInvoiceStatus.tsx (client): status control for the invoice detail page
// - app/coach/payments/[id]/page.tsx: coach-only invoice detail with proof and status control
// - app/api/invoices/[id]/status/route.ts: secure status update + notify student
//
// Usage: node patch.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const join = (...p) => path.join(root, ...p);
const ensure = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
const write = (rel, s) => { const f = join(rel); ensure(path.dirname(f)); fs.writeFileSync(f, s, "utf8"); console.log("✓ wrote", rel); };
const exists = (rel) => fs.existsSync(join(rel));

/* 1) CoachInvoicesTable.tsx (client) */
write("components/payments/CoachInvoicesTable.tsx", `"use client";
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
`);

/* 2) CoachInvoiceStatus.tsx (client) */
write("components/payments/CoachInvoiceStatus.tsx", `"use client";
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
`);

/* 3) Coach invoice detail page */
write("app/coach/payments/[id]/page.tsx", `import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import CoachInvoiceStatus from "@/components/payments/CoachInvoiceStatus";
import Link from "next/link";

export default async function CoachInvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const p = await params; const id = p.id;

  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email } });
  const isAdmin = Boolean((session?.user as any)?.accessLevel === "ADMIN");
  if (!me || (me.role !== "COACH" && !isAdmin)) return notFound();

  const inv = await prisma.invoice.findFirst({
    where: { id, coachId: isAdmin ? undefined : me.id },
    include: { student: true, plan: true },
  });
  if (!inv) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoice (Coach View)</h1>
        <Link href="/coach/payments" className="btn">‹ Back</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <div className="font-medium">{inv.title || (inv.plan?.name || "Plan")}</div>
          <div className="text-sm">Student: {inv.student?.email || "—"}</div>
          <div className="text-sm">Amount: ₱{(inv.amount || 0).toLocaleString()} {inv.currency}</div>
          <div className="text-sm">Status: {inv.status}</div>
          <div className="pt-2">
            <CoachInvoiceStatus invoiceId={inv.id} current={inv.status as any} />
          </div>
        </div>

        <div className="card space-y-2">
          <div className="font-medium">Proof of Payment</div>
          {inv.proofUrl ? (
            inv.proofUrl.toLowerCase().match(/\\.(png|jpg|jpeg|gif|webp)$/)
              ? <img src={inv.proofUrl} alt="Proof of payment" className="rounded-[3px] border" />
              : <a href={inv.proofUrl} className="underline" target="_blank" rel="noreferrer">Open proof</a>
          ) : (
            <div className="muted text-sm">No proof uploaded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
`);

/* 4) API: update invoice status + notify student */
write("app/api/invoices/[id]/status/route.ts", `import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";

type Status = "PENDING"|"SUBMITTED"|"UNDER_REVIEW"|"PAID"|"REJECTED"|"CANCELED";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const inv = await prisma.invoice.findUnique({ where: { id }, include: { student: true } });
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN";
  if (!isAdmin && inv.coachId !== me.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const status = String(body?.status || "");
  const allowed: Status[] = ["PENDING","SUBMITTED","UNDER_REVIEW","PAID","REJECTED","CANCELED"];
  if (!allowed.includes(status as Status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const updated = await prisma.invoice.update({ where: { id }, data: { status: status as any } });

  // Notify student on status change
  const studentEmail = inv.student?.email || "";
  if (studentEmail) {
    try {
      await sendMail(
        studentEmail,
        "Invoice Status Updated",
        "Your invoice " + (inv.title || updated.id) + " is now: " + status + "."
      );
    } catch {}
  }

  return NextResponse.json({ invoice: updated });
}
`);

console.log("All set. Restart dev: pnpm dev");
