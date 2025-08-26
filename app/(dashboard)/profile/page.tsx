import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Your Profile" };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return null;

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });
  if (!me) return null;

  const isCoach = me.role === "COACH";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <div className="card grid gap-3">
        <label className="label">Email
          <input className="input" value={me.email} readOnly />
        </label>
      </div>

      {isCoach && (
        <div className="card grid gap-3">
          <div className="font-medium">External Payment Webhook</div>
          <input className="input" placeholder="https://your-webhook.example.com — (placeholder, not yet active)" readOnly />
          <div className="text-xs muted">This is a placeholder field for a future integration. No changes are saved yet.</div>
        </div>
      )}
    </div>
  );
}
