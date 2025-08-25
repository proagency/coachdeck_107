import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/notify";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  const isAdmin = (session.user as any).accessLevel === "ADMIN" || me?.role === "SUPER_ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id, action } = await req.json().catch(()=>({}));
  if (!id || !["APPROVE","REJECT"].includes(String(action))) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "COACH") return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (action === "APPROVE") {
    await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
    if (user.email) await sendMail(user.email, "CoachDeck — Approved", "Your coach account is approved. You can now sign in.");
  } else {
    await prisma.user.update({ where: { id }, data: { status: "DISABLED" } });
    if (user.email) await sendMail(user.email, "CoachDeck — Rejected", "Your coach account request was rejected.");
  }

  return NextResponse.json({ ok: true });
}
      