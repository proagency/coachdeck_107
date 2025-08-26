import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const cfg = await prisma.adminConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return NextResponse.json({ config: cfg });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN" || me?.role === "SUPER_ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const j = await req.json().catch(() => ({}));
  const url = typeof j.externalPaymentWebhookUrl === "string" ? j.externalPaymentWebhookUrl.trim() : undefined;

  const cfg = await prisma.adminConfig.upsert({
    where: { id: "singleton" },
    update: { externalPaymentWebhookUrl: url },
    create: { id: "singleton", externalPaymentWebhookUrl: url },
  });

  return NextResponse.json({ config: cfg });
}
