import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CoachPaymentsSidebar from "@/components/payments/CoachPaymentsSidebar";
import CoachPaymentsToggles from "@/components/payments/CoachPaymentsToggles";
import CoachBankAccounts from "@/components/payments/CoachBankAccounts";
import CoachEwallets from "@/components/payments/CoachEwallets";
import CoachPlansForm from "@/components/payments/CoachPlansForm";
import CoachInvoicesTable from "@/components/payments/CoachInvoicesTable";
import { notFound } from "next/navigation";

export const metadata = { title: "Coach Payments — CoachDeck" };

export default async function CoachPaymentsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return notFound();

  const cfg = await prisma.coachPaymentsConfig.upsert({ where: { coachId: me.id }, update: {}, create: { coachId: me.id } });
  const banks = await prisma.coachBankAccount.findMany({ where: { coachId: me.id }, orderBy: { createdAt: "desc" }});
  const wallets = await prisma.coachEwallet.findMany({ where: { coachId: me.id }, orderBy: { createdAt: "desc" }});
  const plans = await prisma.paymentPlan.findMany({ where: { coachId: me.id }, orderBy: { createdAt: "desc" }});
  const invoices = await prisma.invoice.findMany({ where: { coachId: me.id }, include: { student:true, plan:true }, orderBy: { createdAt: "desc" } });

  return (
    <div className="relative">
      <CoachPaymentsSidebar />
      <div className="space-y-6 md:ml-5">
        <h1 className="text-2xl font-semibold">Payments</h1>

        <section id="toggles" className="card space-y-3 scroll-mt-24">
          <div className="font-medium">Payment Toggles</div>
          <CoachPaymentsToggles initial={{ enableBank: cfg.enableBank, enableEwallet: cfg.enableEwallet, bookingUrl: cfg.bookingUrl ?? "" }} />
        </section>

        <section id="banks" className="card space-y-3 scroll-mt-24">
          <div className="font-medium">Bank Accounts</div>
          <CoachBankAccounts initial={banks} />
        </section>

        <section id="ewallets" className="card space-y-3 scroll-mt-24">
          <div className="font-medium">E-Wallets</div>
          <CoachEwallets initial={wallets} />
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
