import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "node:crypto";
import { sendMail } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(()=>({}));
  if (!email) return NextResponse.json({ error: "email_required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const url = new URL("/reset-password", base);
    url.searchParams.set("token", token);
    url.searchParams.set("email", email);
    await sendMail(email, "Reset your CoachDeck password", "Reset link (30 mins): " + url.toString());
  }
  return NextResponse.json({ ok: true });
}
      