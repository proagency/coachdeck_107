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

  const { enableBank, enableEwallet, bookingUrl } = await req.json().catch(()=>({}));

  const cfg = await prisma.coachPaymentsConfig.upsert({
    where: { coachId: me.id },
    update: {
      enableBank: !!enableBank,
      enableEwallet: !!enableEwallet,
      ...(typeof bookingUrl === "string" ? { bookingUrl } : {})
    },
    create: {
      coachId: me.id,
      enableBank: !!enableBank,
      enableEwallet: !!enableEwallet,
      ...(typeof bookingUrl === "string" ? { bookingUrl } : {})
    }
  });

  return NextResponse.json({ ok: true, config: cfg });
}
      