import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const j = await req.json().catch(()=>null);
  if (!j?.name || !j?.type || typeof j.amount !== "number") return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const plan = await prisma.paymentPlan.create({
    data: {
      coach: { connect: { id: me.id } },
      name: String(j.name),
      description: j.description ? String(j.description) : null,
      type: j.type === "SUBSCRIPTION" ? "SUBSCRIPTION" : "ONE_TIME",
      amount: Math.max(0, Math.floor(j.amount)),
      currency: j.currency ? String(j.currency) : "PHP",
      active: j.active === false ? false : true
    }
  });

  return NextResponse.json({ plan }, { status: 201 });
}
      