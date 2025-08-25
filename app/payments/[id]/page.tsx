import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ProofUploadForm from "@/components/payments/ProofUploadForm";
import { notFound } from "next/navigation";

export const metadata = { title: "Invoice — CoachDeck" };

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }>}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "STUDENT") return notFound();

  const inv = await prisma.invoice.findFirst({
    where: { id, studentId: me.id },
    include: { plan: { include: { coach: true } }, coach: true }
  });
  if (!inv) return notFound();

  const banks = await prisma.coachBankAccount.findMany({ where: { coachId: inv.coachId }});
  const wallets = await prisma.coachEwallet.findMany({ where: { coachId: inv.coachId }});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Invoice</h1>

      <div className="card">
        <div className="font-medium">{inv.title}</div>
        {inv.description && <div className="muted text-sm">{inv.description}</div>}
        <div className="text-sm mt-2">Coach: {inv.coach.email}</div>
        <div className="text-sm">Plan: {inv.plan?.name ?? "—"}</div>
        <div className="text-lg font-semibold mt-2">₱{inv.amount.toLocaleString()} {inv.currency}</div>
        <div className="badge border mt-2">{inv.status}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-medium mb-2">Bank Transfer</div>
          {banks.length === 0 ? <div className="muted text-sm">No bank channels available.</div> : (
            <ul className="text-sm list-disc ml-4">
              {banks.map(b => (
                <li key={b.id}><span className="font-medium">{b.bankName}</span> — {b.accountName} ({b.accountNumber}) {b.branch ? \`• \${b.branch}\` : ""}</li>
              ))}
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

      <ProofUploadForm invoiceId={inv.id} />
    </div>
  );
}
