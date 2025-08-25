import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "STUDENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const j = await req.json().catch(()=>null);
  const planId = String(j?.planId || "");
  const channel = j?.channel === "E_WALLET" ? "E_WALLET" : "BANK";
  if (!planId) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const plan = await prisma.paymentPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) return NextResponse.json({ error: "plan_not_found" }, { status: 404 });

  // Determine coach-student relationship via any membership with this coach
  const mem = await prisma.membership.findFirst({
    where: { studentId: me.id, deck: { coachId: plan.coachId } },
    include: { deck: true }
  });
  if (!mem) return NextResponse.json({ error: "no_relationship_with_coach" }, { status: 403 });

  const invoice = await prisma.invoice.create({
    data: {
      planId: plan.id,
      coachId: plan.coachId,
      studentId: me.id,
      channel,
      amount: plan.amount,
      currency: plan.currency,
      title: plan.name,
      description: plan.description || null
    }
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
      