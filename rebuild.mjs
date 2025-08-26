import fs from "fs";
import path from "path";

const root = process.cwd();
const file = path.join(root, "app/admin/plans/page.tsx");

const code = `import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AdminWebhookForm from "@/components/admin/AdminWebhookForm";
import { notFound } from "next/navigation";

export const metadata = { title: "Plans Configuration — Admin" };

export default async function AdminPlansPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN" || me?.role === "SUPER_ADMIN";
  if (!isAdmin) return notFound();

  const cfg = await prisma.adminConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Plans Configuration</h1>

      <section className="card space-y-2">
        <div className="font-medium">External Payment Webhook</div>
        <AdminWebhookForm initial={{ externalPaymentWebhookUrl: cfg.externalPaymentWebhookUrl }} />
      </section>
    </div>
  );
}
`;

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, code, "utf8");
console.log("✅ fixed:", file);
