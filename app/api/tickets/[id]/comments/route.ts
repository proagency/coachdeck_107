import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/notify";

export async function POST(req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { body } = await req.json().catch(()=>({}));
  if (!body || typeof body !== "string") return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const id = String(ctx?.params?.id || "");
  // Ensure membership to ticket's deck
  const can = await prisma.ticket.findFirst({
    where: {
      id,
      OR: [
        { authorId: me.id },
        { assignedToId: me.id },
        { deck: { coachId: me.id } },
        { deck: { membership: { studentId: me.id } } }
      ]
    },
    include: { deck: { include: { membership: { include: { student: true } }, coach: true } }, author: true }
  });
  if (!can) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const comment = await prisma.ticketComment.create({ data: { ticketId: id, authorId: me.id, body } });

  // notify student on new reply
  const studentEmail = can.deck.membership?.student?.email || "";
  if (studentEmail) {
    await sendMail(
      studentEmail,
      "Ticket Reply",
      \`Your ticket: "\${can.title}" has a new reply by \${email}:\\n\\n\${body}\`
    );
  }

  return NextResponse.json({ comment }, { status: 201 });
}
      