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
  if (!j?.provider || !j?.handle) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const wallet = await prisma.coachEwallet.create({
    data: {
      provider: String(j.provider),
      handle: String(j.handle),
      coach: { connect: { id: me.id } }
    }
  });
  return NextResponse.json({ wallet }, { status: 201 });
}
      