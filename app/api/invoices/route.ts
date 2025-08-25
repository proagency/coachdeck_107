import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "STUDENT") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const j = await req.json().catch(function(){ return null as any; });
  const planId = j?.planId ? String(j.planId) : "";
  if (!planId) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const plan = await prisma.paymentPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) return NextResponse.json({ error: "plan_unavailable" }, { status: 404 });

  let channel: "BANK" | "E_WALLET" = "BANK";
  if (j?.channel === "BANK" || j?.channel === "E_WALLET") {
    channel = j.channel;
  } else {
    const cfg = await prisma.coachPaymentsConfig.findUnique({ where: { coachId: plan.coachId } });
    if (cfg) {
      if (cfg.enableBank) channel = "BANK";
      else if (cfg.enableEwallet) channel = "E_WALLET";
    }
  }

  const invoice = await prisma.invoice.create({
    data: {
      title: plan.name + " Plan",
      coachId: plan.coachId,
      studentId: me.id,
      planId: plan.id,
      amount: plan.amount,
      currency: plan.currency,
      channel,
      status: "PENDING",
    },
    select: { id: true },
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
