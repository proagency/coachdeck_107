import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendMail } from "@/lib/notify";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const coach = await prisma.user.findUnique({ where: { email } });
  if (!coach || (coach.role !== "COACH" && session?.user?.accessLevel !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const studentEmail = String(body?.studentEmail || "").trim().toLowerCase();
  if (!name || !studentEmail) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  // student account (create if missing)
  let student = await prisma.user.findUnique({ where: { email: studentEmail } });
  let tempPass = "";
  if (!student) {
    tempPass = Math.random().toString(36).slice(2, 10);
    const hash = await bcrypt.hash(tempPass, 10);
    student = await prisma.user.create({
      data: {
        email: studentEmail,
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: hash
      }
    });
    // email student credentials
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    await sendMail(
      studentEmail,
      "Welcome to CoachDeck",
      [
        "You've been invited to a deck by your coach.",
        \`URL: \${base}\`,
        \`Email: \${studentEmail}\`,
        \`Temporary Password: \${tempPass}\`,
        "",
        "Please sign in and change your password."
      ].join("\\n")
    );
  }

  // create deck + membership
  const deck = await prisma.deck.create({
    data: {
      name,
      coachId: coach.id,
      membership: { create: { studentId: student.id } }
    },
    include: { membership: { include: { student: true } } }
  });

  return NextResponse.json({ deck }, { status: 201 });
}
      