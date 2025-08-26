// patch.mjs
// Fix: remove onClick handlers from Server Components and use <Link> instead.
//
// - app/payments/page.tsx: top "Back" -> Link to /decks
// - app/payments/[id]/page.tsx: top "Back" -> Link to /payments
//
// Usage: node patch.mjs

import fs from "fs";
import path from "path";
const join = (...p) => path.join(process.cwd(), ...p);
const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
const write = (rel, s) => { const f=join(rel); ensureDir(path.dirname(f)); fs.writeFileSync(f, s, "utf8"); console.log("✓ wrote", rel); };
const exists = (rel) => fs.existsSync(join(rel));

/* app/payments/page.tsx */
if (exists("app/payments/page.tsx")) {
  const content = `import { prisma } from "@/lib/db";
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
        <Link href="/decks" className="btn">‹ Back</Link>
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
`;
  write("app/payments/page.tsx", content);
} else {
  console.log("! Skipped: app/payments/page.tsx not found");
}

/* app/payments/[id]/page.tsx */
if (exists("app/payments/[id]/page.tsx")) {
  const content = `import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
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
        <Link href="/payments" className="btn">‹ Back</Link>
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
  write("app/payments/[id]/page.tsx", content);
} else {
  console.log("! Skipped: app/payments/[id]/page.tsx not found");
}

console.log("Done. Restart your dev server (pnpm dev).");
