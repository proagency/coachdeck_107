import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const metadata = { title: "Approvals — CoachDeck" };

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email } });

  const isAdmin =
    ((session?.user as any)?.accessLevel === "ADMIN") || (me?.role === "SUPER_ADMIN");
  if (!me || !isAdmin) return notFound();

  const pending = await prisma.user.findMany({
    where: { role: "COACH", status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, createdAt: true, status: true, role: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Coach Approvals</h1>
      <div className="card">
        {pending.length === 0 ? (
          <div className="muted text-sm">No pending signups.</div>
        ) : (
          <ul className="grid gap-2">
            {pending.map((u) => (
              <li key={u.id} className="border rounded p-3 flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">{u.email}</div>
                  <div className="muted">{u.name || "—"}</div>
                </div>
                {/* keep your existing approve/deny UI here */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
