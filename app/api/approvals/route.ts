import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET: list pending coach signups (Super Admin or Admin only)
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  const isAdmin = ((session?.user as any)?.accessLevel === "ADMIN") || me?.role === "SUPER_ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const pending = await prisma.user.findMany({
    where: { role: "COACH", status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, createdAt: true, status: true, role: true },
  });

  return NextResponse.json({ pending });
}

/**
 * POST: approve/deny a pending coach
 * body: { id: string; action: "APPROVE" | "DENY" }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  const isAdmin = ((session?.user as any)?.accessLevel === "ADMIN") || me?.role === "SUPER_ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id, action } = await req.json().catch(() => ({} as { id?: string; action?: string }));
  if (!id || (action !== "APPROVE" && action !== "DENY")) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { id } });
  if (!exists || exists.role !== "COACH") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (action === "APPROVE") {
    await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
  } else {
    await prisma.user.update({ where: { id }, data: { status: "DISABLED" } });
  }

  return NextResponse.json({ ok: true });
}
