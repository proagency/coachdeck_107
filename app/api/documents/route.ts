import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { deckId, title, url } = await req.json().catch(()=>({}));
  if (!deckId || !title) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const isAdmin = (session.user as any).accessLevel === "ADMIN";
  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck) return NextResponse.json({ error: "deck_not_found" }, { status: 404 });
  if (!isAdmin && deck.coachId !== me.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const doc = await prisma.document.create({
    data: { deckId: deck.id, title: String(title), url: url ? String(url) : null, createdById: me.id },
  });
  return NextResponse.json({ document: doc }, { status: 201 });
}
      