import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProofUploadForm from "@/components/payments/ProofUploadForm";

export const metadata = { title: "Invoice — CoachDeck" };

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const id = p.id;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!me) return notFound();

  const inv = await prisma.invoice.findFirst({
    where: { id },
    include: { plan: true, coach: true, student: true },
  });
  if (!inv) return notFound();

  const isStudentOwner = inv.studentId === me.id && me.role === "STUDENT";
  const isCoachOwner = inv.coachId === me.id && me.role === "COACH";
  const isAdmin = me.role === "SUPER_ADMIN" || (session?.user as any)?.accessLevel === "ADMIN";
  if (!isStudentOwner && !isCoachOwner && !isAdmin) return notFound();

  const banks = await prisma.coachBankAccount.findMany({ where: { coachId: inv.coachId } });
  const wallets = await prisma.coachEwallet.findMany({ where: { coachId: inv.coachId } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Invoice</h1>
        <Link className="btn" href="/payments">Back</Link>
      </div>

      <div className="card space-y-2">
        <div className="font-medium">Title</div>
        <div>{inv.title || (inv.plan ? inv.plan.name + " Plan" : "—")}</div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <div className="muted text-sm">Amount</div>
            <div className="font-semibold">{(inv.currency === "PHP" ? "₱" : "") + inv.amount.toLocaleString()} {inv.currency}</div>
          </div>
          <div>
            <div className="muted text-sm">Status</div>
            <div className="font-semibold">{inv.status}</div>
          </div>
          <div>
            <div className="muted text-sm">Channel</div>
            <div className="font-semibold">{inv.channel || "-"}</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-medium mb-2">Bank Accounts</div>
          {banks.length === 0 ? (
            <div className="muted text-sm">No bank channels available.</div>
          ) : (
            <ul className="text-sm list-disc ml-4">
              {banks.map(function(b){
                return (
                  <li key={b.id}><span className="font-medium">{b.bankName}</span>{" — "}{b.accountName}{" ("}{b.accountNumber}{")"}{b.branch? " • " + b.branch : ""}</li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="font-medium mb-2">E-Wallets</div>
          {wallets.length === 0 ? (
            <div className="muted text-sm">No e-wallet channels available.</div>
          ) : (
            <ul className="text-sm list-disc ml-4">
              {wallets.map(function(w){
                return (<li key={w.id}><span className="font-medium">{w.provider}</span>{" — "}{w.handle}</li>);
              })}
            </ul>
          )}
        </div>
      </div>

      {isStudentOwner && (
        <div className="card">
          <div className="font-medium mb-2">Upload proof of payment</div>
          <ProofUploadForm invoiceId={inv.id} />
        </div>
      )}
    </div>
  );
}
