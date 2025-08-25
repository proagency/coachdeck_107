import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const content = req.headers.get("content-type") || "";
  const raw = content.includes("application/x-www-form-urlencoded")
    ? Object.fromEntries((await req.formData()).entries())
    : await req.json().catch(() => ({}));

  const deckId = String(raw.deckId || "");
  const title = String(raw.title || "");
  const body = String(raw.body || "");
  if (!deckId || !title || !body) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, OR: [{ coachId: me.id }, { membership: { studentId: me.id } }] },
    include: { coach: true, membership: { include: { student: true } } },
  });
  if (!deck) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ticket = await prisma.ticket.create({
    data: { deckId: deck.id, authorId: me.id, title, body },
  });

  const coachEmail = deck.coach.email || "";
  if (coachEmail) {
    const subject = "New Ticket Created";
    const msg = "Title: " + title + "\nDeck: " + deck.name + "\nBy: " + email;
    await sendMail(coachEmail, subject, msg);
  }

  if (content.includes("application/x-www-form-urlencoded")) {
    return new NextResponse(null, { status: 303, headers: { Location: "/decks/" + deck.id } });
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
