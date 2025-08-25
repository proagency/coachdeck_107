import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import AdminPlansForm from "@/components/admin/AdminPlansForm";

export const metadata = { title: "Plans Configuration — CoachDeck" };

export default async function AdminPlansPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!me || me.role !== "SUPER_ADMIN") return notFound();

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Plans Configuration</h1>
      <div className="card">
        <AdminPlansForm initial={{
          currency: pricing.currency,
          starterMonthly: pricing.starterMonthly,
          starterYearly: pricing.starterYearly,
          proMonthly: pricing.proMonthly,
          proYearly: pricing.proYearly,
        }} />
      </div>
    </div>
  );
}
