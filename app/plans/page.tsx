import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PlansClient from "@/components/plans/PlansClient";

export const metadata = { title: "Plans & Billing — CoachDeck" };

export default async function PlansPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
  if (!me || me.role !== "COACH") return notFound();

  const pricing = await prisma.planPricing.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      currency: "PHP",
      starterMonthly: 499,
      starterYearly: 4990,
      proMonthly: 999,
      proYearly: 9990,
    },
  });

  const starter = { decks: 30, monthly: pricing.starterMonthly, yearly: pricing.starterYearly };
  const pro = { decks: "Unlimited", monthly: pricing.proMonthly, yearly: pricing.proYearly };

  const planTier = (me as any).planTier || "FREE";
  const billingTerm = (me as any).billingTerm || "NONE";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Plans &amp; Billing</h1>

      <div className="card flex items-center justify-between">
        <div className="space-y-1">
          <div className="muted text-sm">Current plan</div>
          <div className="font-semibold">
            {String(planTier)} {billingTerm !== "NONE" ? "(" + String(billingTerm) + ")" : ""}
          </div>
        </div>
        <div className="muted text-xs">Prices in PHP. Change your plan anytime.</div>
      </div>

      <PlansClient
        coach={{ name: me.name || "", email: String(me.email || ""), phone: me.phone || "" }}
        starter={starter}
        pro={pro}
      />
    </div>
  );
}
