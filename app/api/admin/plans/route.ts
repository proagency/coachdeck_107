import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const pricing = await prisma.planPricing.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      currency: "PHP",
      starterMonthly: 499,
      starterYearly: 4990,
      proMonthly: 999,
      proYearly: 9990,
    },
  });
  return NextResponse.json({ pricing });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!me || me.role !== "SUPER_ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const j = await req.json().catch(() => null as any);
  const currency = j && j.currency ? String(j.currency) : "PHP";
  const sM = Number(j && j.starterMonthly);
  const sY = Number(j && j.starterYearly);
  const pM = Number(j && j.proMonthly);
  const pY = Number(j && j.proYearly);

  function posInt(n: any) {
    return Number.isFinite(n) && n >= 0 && Math.floor(n) === n;
  }
  if (!posInt(sM) || !posInt(sY) || !posInt(pM) || !posInt(pY)) {
    return NextResponse.json({ error: "invalid_amounts" }, { status: 400 });
  }

  const pricing = await prisma.planPricing.update({
    where: { id: "global" },
    data: {
      currency,
      starterMonthly: sM,
      starterYearly: sY,
      proMonthly: pM,
      proYearly: pY,
      updatedById: me.id,
    },
  });

  return NextResponse.json({ pricing });
}
