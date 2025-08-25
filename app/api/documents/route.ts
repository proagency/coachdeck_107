import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const payload = await req.json().catch(() => ({} as any));
  const deckId = typeof payload.deckId === "string" ? payload.deckId : "";
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const url =
    typeof payload.url === "string" && payload.url.trim() ? payload.url.trim() : null;

  if (!deckId || !title) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const isAdmin = ((session?.user as any)?.accessLevel === "ADMIN");
  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck) return NextResponse.json({ error: "deck_not_found" }, { status: 404 });
  if (!isAdmin && deck.coachId !== me.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const doc = await prisma.document.create({
    data: { deckId, title, url, createdById: me.id },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
