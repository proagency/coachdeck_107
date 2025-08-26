// patch.mjs
// Fix /profile input value type by coercing nullable email to a string.
// Usage: node patch.mjs
import fs from "fs";
import path from "path";

const join = (...p) => path.join(process.cwd(), ...p);
const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
const write = (rel, s) => { const f=join(rel); ensureDir(path.dirname(f)); fs.writeFileSync(f, s, "utf8"); console.log("✓ wrote", rel); };

const content = `import { getServerSession } from "next-auth";
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
          {/* Coerce nullable email to a string for the input value */}
          <input className="input" value={me.email ?? ""} readOnly />
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
`;

write("app/(dashboard)/profile/page.tsx", content);
