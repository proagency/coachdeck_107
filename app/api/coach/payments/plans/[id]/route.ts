import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = String(ctx?.params?.id || "");
  const plan = await prisma.paymentPlan.findFirst({ where: { id, coachId: me.id } });
  if (!plan) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const j = await req.json().catch(()=>({}));

  const updated = await prisma.paymentPlan.update({
    where: { id },
    data: {
      ...(typeof j.name === "string" ? { name: j.name } : {}),
      ...(typeof j.description === "string" ? { description: j.description } : {}),
      ...(typeof j.amount === "number" ? { amount: Math.max(0, Math.floor(j.amount)) } : {}),
      ...(typeof j.currency === "string" ? { currency: j.currency } : {}),
      ...(typeof j.type === "string" && (j.type==="ONE_TIME" || j.type==="SUBSCRIPTION") ? { type: j.type } : {}),
      ...(typeof j.active === "boolean" ? { active: j.active } : {})
    }
  });

  return NextResponse.json({ plan: updated });
}

export async function DELETE(_req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = String(ctx?.params?.id || "");
  const plan = await prisma.paymentPlan.findFirst({ where: { id, coachId: me.id } });
  if (!plan) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.paymentPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
      