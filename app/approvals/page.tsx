import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";

export const metadata = { title: "Approvals — CoachDeck" };

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();
  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || ((session.user as any).accessLevel !== "ADMIN" && me.role !== "SUPER_ADMIN")) return notFound();

  const pending = await prisma.user.findMany({
    where: { role: "COACH", status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, phone: true, createdAt: true }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Coach Approvals</h1>
      {pending.length === 0 && <div className="card muted text-sm">No coach signups pending.</div>}
      <div className="grid gap-3">
        {pending.map(u => (
          <div key={u.id} className="card flex items-center justify-between">
            <div>
              <div className="font-medium">{u.email}</div>
              <div className="text-sm muted">{u.name ?? "—"} • {u.phone ?? "—"}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={async()=>{await fetch("/api/approvals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ id:u.id, action:"APPROVE" })}); (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Approved"}})); location.reload();}}>Approve</button>
              <button className="btn" onClick={async()=>{await fetch("/api/approvals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ id:u.id, action:"REJECT" })}); (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Rejected"}})); location.reload();}}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
