import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/notify";

export async function PATCH(req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { status } = await req.json().catch(()=>({}));
  if (!["OPEN","IN_PROGRESS","RESOLVED","CLOSED"].includes(String(status))) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const id = String(ctx?.params?.id || "");
  const t = await prisma.ticket.findUnique({ where: { id }, include: { deck: { include: { membership: { include: { student: true } }, coach: true } } } });
  if (!t) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isAdmin = (session.user as any).accessLevel === "ADMIN";
  const isCoach = t.deck.coachId === me.id;
  if (!isAdmin && !isCoach) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const updated = await prisma.ticket.update({ where: { id }, data: { status } });

  // notify student on status change
  const studentEmail = t.deck.membership?.student?.email || "";
  if (studentEmail) {
    await sendMail(
      studentEmail,
      "Ticket Status Updated",
      \`Your ticket status changed to \${status} for deck "\${t.deck.name}".\`
    );
  }

  return NextResponse.json({ ticket: updated });
}
      