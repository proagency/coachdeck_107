import Link from "next/link";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";

export const metadata = { title: "Payments — CoachDeck" };

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
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Your Invoices</h1>
      <div className="card">
        <div className="space-y-3">
          {invoices.length === 0 && <div className="muted text-sm">No invoices yet.</div>}
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium">{inv.title}</div>
                <div className="text-sm muted">
                  Coach: {inv.coach?.email || ""} — Status: {inv.status}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {"₱" + inv.amount.toLocaleString()} {inv.currency}
                </div>
                <Link href={"/payments/" + inv.id} className="btn mt-2 btn-primary">
                  View / Pay
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
