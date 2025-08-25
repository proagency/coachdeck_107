import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Your Invoices — CoachDeck" };

export default async function StudentPaymentsIndexPage() {
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
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Your Invoices</h1>

      <div className="grid gap-3">
        {invoices.length === 0 && (
          <div className="card">
            <div className="muted">No invoices yet.</div>
          </div>
        )}

        {invoices.map((inv) => (
          <div key={inv.id} className="card flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="font-medium">{inv.title}</div>
              {inv.description ? <div className="muted">{inv.description}</div> : null}
              <div className="text-sm">
                Coach: {inv.coach.email} • Plan: {inv.plan?.name ?? "—"}
              </div>
              <div className="text-sm">Status: {inv.status}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">₱{inv.amount.toLocaleString()} {inv.currency}</div>
              <Link
                href={\`/payments/\${inv.id}\`}
                className="btn mt-2 btn-primary"
              >
                View / Pay
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
