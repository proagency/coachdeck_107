import { prisma } from "@/lib/db";
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
