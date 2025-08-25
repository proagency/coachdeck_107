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
  if (!j?.bankName || !j?.accountName || !j?.accountNumber) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const bank = await prisma.coachBankAccount.create({
    data: {
      bankName: String(j.bankName),
      accountName: String(j.accountName),
      accountNumber: String(j.accountNumber),
      branch: j.bankBranch ? String(j.bankBranch) : null,
      coach: { connect: { id: me.id } }
    }
  });
  return NextResponse.json({ bank }, { status: 201 });
}
      