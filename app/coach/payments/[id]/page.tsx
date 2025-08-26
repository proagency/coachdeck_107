import { prisma } from "@/lib/db";
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
            inv.proofUrl.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/)
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
