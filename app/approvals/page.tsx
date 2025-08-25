import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ApproveControls from "@/components/approvals/ApproveControls";

export const metadata = { title: "Approvals — CoachDeck" };

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  // Super Admin only (per your latest requirement)
  if (!me || me.role !== "SUPER_ADMIN") return notFound();

  const pending = await prisma.user.findMany({
    where: { role: "COACH", status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, phone: true, createdAt: true },
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
              <li
                key={u.id}
                data-approve-row={u.id}
                className="border rounded-[3px] p-3 flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="font-medium">{u.name || "—"}</div>
                  <div className="text-sm">{u.email}</div>
                  <div className="text-xs muted">
                    Requested: {u.createdAt.toLocaleString()}
                    {u.phone ? " • " + u.phone : ""}
                  </div>
                </div>

                {/* Approve / Deny actions (client component) */}
                <ApproveControls id={u.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
