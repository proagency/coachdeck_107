import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = String(ctx?.params?.id || "");
  const rec = await prisma.coachEwallet.findFirst({ where: { id, coachId: me.id } });
  if (!rec) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.coachEwallet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
      