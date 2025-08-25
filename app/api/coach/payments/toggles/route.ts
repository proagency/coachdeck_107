import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || (me.role !== "COACH" && (session?.user as any)?.accessLevel !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { enableBank, enableEwallet } = await req.json().catch(()=>({}));
  const cfg = await prisma.coachPaymentsConfig.upsert({
    where: { coachId: me.id },
    update: {
      enableBank: !!enableBank,
      enableEwallet: !!enableEwallet,
    },
    create: {
      coachId: me.id,
      enableBank: !!enableBank,
      enableEwallet: !!enableEwallet,
    },
  });

  return NextResponse.json({ ok: true, config: cfg });
}
