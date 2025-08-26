// patch.mjs
// Move floating anchor nav to the RIGHT on /coach/payments and adjust padding.
// Usage: node patch.mjs
import fs from "fs";
import path from "path";

const root = process.cwd();
const join = (...p) => path.join(root, ...p);
const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
const write = (rel, s) => { const f=join(rel); ensureDir(path.dirname(f)); fs.writeFileSync(f, s, "utf8"); console.log("✓ wrote", rel); };

write(
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

  // Ensure config exists
  const cfg = await prisma.coachPaymentsConfig.upsert({
    where: { coachId: me.id },
    update: {},
    create: { coachId: me.id },
  });

  const banks = await prisma.coachBankAccount.findMany({ where: { coachId: me.id }, orderBy: { createdAt: "desc" } });
  const wallets = await prisma.coachEwallet.findMany({ where: { coachId: me.id }, orderBy: { createdAt: "desc" } });
  const plans = await prisma.paymentPlan.findMany({ where: { coachId: me.id }, orderBy: { createdAt: "desc" } });
  const invoices = await prisma.invoice.findMany({ where: { coachId: me.id }, include: { student: true, plan: true }, orderBy: { createdAt: "desc" } });

  return (
    <div className="relative">
      {/* Floating anchor links (md+) — now on the RIGHT */}
      <nav
        className="hidden md:block fixed right-6 top-28 z-10 w-44 p-2 bg-white/90 backdrop-blur border rounded-[3px] shadow-sm space-y-2"
        aria-label="Section links"
      >
        <a href="#toggles" className="btn w-full justify-start">Payment Toggles</a>
        <a href="#banks" className="btn w-full justify-start">Bank Accounts</a>
        <a href="#wallets" className="btn w-full justify-start">E-Wallets</a>
        <a href="#plans" className="btn w-full justify-start">Plans</a>
        <a href="#invoices" className="btn w-full justify-start">Invoices</a>
      </nav>

      {/* Content with RIGHT padding so floating nav doesn't overlap */}
      <div className="md:pr-56 space-y-6">
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
