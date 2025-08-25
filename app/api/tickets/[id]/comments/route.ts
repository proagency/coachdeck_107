import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/notify";

export async function POST(req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const text = typeof payload.body === "string" ? payload.body : "";
  if (!text) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const id = String(ctx?.params?.id || "");
  const can = await prisma.ticket.findFirst({
    where: {
      id,
      OR: [
        { authorId: me.id },
        { assignedToId: me.id },
        { deck: { coachId: me.id } },
        { deck: { membership: { studentId: me.id } } },
      ],
    },
    include: { deck: { include: { membership: { include: { student: true } }, coach: true } }, author: true },
  });
  if (!can) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const comment = await prisma.ticketComment.create({ data: { ticketId: id, authorId: me.id, body: text } });

  const studentEmail = can.deck.membership?.student?.email || "";
  if (studentEmail) {
    const subject = "Ticket Reply";
    const body =
      'Your ticket: "' +
      (can.title || "") +
      '" has a new reply by ' +
      (email || "") +
      ":\n\n" +
      text;
    await sendMail(studentEmail, subject, body);
  }

  return NextResponse.json({ comment }, { status: 201 });
}
