// patch.mjs
// Robust proof-of-payment rendering: adds ProofImage client component,
// hardens upload route to store a public /uploads URL, and uses ProofImage on
// coach & student invoice pages.
//
// Usage: node patch.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const join = (...p) => path.join(root, ...p);
const ensure = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
const write = (rel, s) => { const f = join(rel); ensure(path.dirname(f)); fs.writeFileSync(f, s, "utf8"); console.log("✓ wrote", rel); };
const exists = (rel) => fs.existsSync(join(rel));

/* 1) Client component: ProofImage */
write(
  "components/payments/ProofImage.tsx",
  `"use client";
import React from "react";

/**
 * Tries to render an <img> for the given URL.
 * If it fails (onError), falls back to a simple anchor link.
 * Works with relative (/uploads/...) or absolute URLs and ignores file extensions.
 */
export default function ProofImage({ url, alt = "Proof of payment", className = "" }: { url: string; alt?: string; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  if (!url) return <div className="muted text-sm">No proof uploaded yet.</div>;

  // Normalize: if it looks like a filesystem path, try to make it web-accessible
  const webUrl = url.startsWith("/uploads/") || url.startsWith("http") ? url : (url.includes("uploads") ? url.slice(url.indexOf("uploads")).replace(/^uploads/, "/uploads") : url);

  if (failed) {
    return (
      <div className="space-y-1">
        <div className="muted text-sm">Couldn&apos;t load the image. Open the file instead:</div>
        <a href={webUrl} className="underline break-all" target="_blank" rel="noreferrer">{webUrl}</a>
      </div>
    );
  }

  return (
    <img
      src={webUrl}
      alt={alt}
      className={className + " rounded-[3px] border max-w-full h-auto"}
      onError={() => setFailed(true)}
    />
  );
}
`
);

/* 2) Harden upload route: always store /uploads/<filename> */
write(
  "app/api/invoices/[id]/upload/route.ts",
  `import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { promises as fs } from "fs";
import { join } from "path";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Only student who owns this invoice or the coach/admin can upload
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { student: true, coach: true } });
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const me = await prisma.user.findFirst({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isOwnerStudent = inv.studentId === me.id;
  const isCoach = inv.coachId === me.id;
  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN";
  if (!isOwnerStudent && !isCoach && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  const safe = (file.name || "proof")
    .toLowerCase()
    .replace(/[^a-z0-9\\.\\-_]+/g, "_")
    .slice(0, 120);

  const filename = \`\${id}-\${Date.now()}-\${safe || "proof"}\`;
  const dir = join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const full = join(dir, filename);
  await fs.writeFile(full, buf);

  const proofUrl = "/uploads/" + filename;
  const updated = await prisma.invoice.update({ where: { id }, data: { proofUrl, status: inv.status === "PENDING" ? "SUBMITTED" : inv.status } });

  return NextResponse.json({ ok: true, proofUrl: updated.proofUrl });
}
`
);

/* 3) Use ProofImage on coach invoice page */
if (exists("app/coach/payments/[id]/page.tsx")) {
  write(
    "app/coach/payments/[id]/page.tsx",
    `import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import CoachInvoiceStatus from "@/components/payments/CoachInvoiceStatus";
import ProofImage from "@/components/payments/ProofImage";
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
          {inv.proofUrl
            ? <ProofImage url={inv.proofUrl} />
            : <div className="muted text-sm">No proof uploaded yet.</div>}
        </div>
      </div>
    </div>
  );
}
`
  );
} else {
  console.log("! Skipped: app/coach/payments/[id]/page.tsx not found");
}

/* 4) Use ProofImage on student invoice page (read-only) */
if (exists("app/payments/[id]/page.tsx")) {
  write(
    "app/payments/[id]/page.tsx",
    `import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProofUploadForm from "@/components/payments/ProofUploadForm";
import ProofImage from "@/components/payments/ProofImage";

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
        <Link href="/payments" className="btn">‹ Back</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <div className="font-medium">{inv.title || (inv.plan?.name || "Plan")}</div>
          <div className="muted text-sm">Coach: {inv.coach?.email}</div>
          <div className="text-sm">Amount Due: ₱{(inv.amount || 0).toLocaleString()} {inv.currency}</div>
          <div className="text-sm">Status: {inv.status}</div>
          {inv.proofUrl && (
            <div className="pt-2">
              <div className="font-medium mb-1">Your uploaded proof</div>
              <ProofImage url={inv.proofUrl} />
            </div>
          )}
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
`
  );
} else {
  console.log("! Skipped: app/payments/[id]/page.tsx not found");
}

console.log("Done. Restart your dev server (pnpm dev) and test an uploaded proof image.");
