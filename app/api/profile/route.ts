import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isForm = req.headers.get("content-type")?.includes("application/x-www-form-urlencoded");
  const data: any = isForm ? Object.fromEntries((await req.formData()).entries()) : await req.json().catch(() => ({}));
  if (data._method === "DELETE") return DELETE(req);

  const name = (data.name ?? "").toString().trim() || null;
  const phone = (data.phone ?? "").toString().trim() || null;
  const bookingUrl = (data.bookingUrl ?? "").toString().trim() || null;

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Save user
  const updated = await prisma.user.update({ where: { id: me.id }, data: { name, phone } });

  // If coach/admin and bookingUrl provided, upsert coach config
  const canSetBooking = updated.role === "COACH" || (session.user as any).accessLevel === "ADMIN";
  if (canSetBooking && bookingUrl !== null) {
    await prisma.coachPaymentsConfig.upsert({
      where: { coachId: updated.id },
      update: { bookingUrl },
      create: { coachId: updated.id, bookingUrl }
    });
  }

  return NextResponse.json({ ok: true, user: { id: updated.id, name: updated.name, phone: updated.phone } });
}

export async function DELETE(_: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email }, include: {
    decks: true, memberships: true, documents: true, tickets: true, comments: true,
  }});
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (me.accessLevel === "ADMIN") return NextResponse.json({ error: "cannot_delete_admin" }, { status: 403 });
  if (me.decks.length) return NextResponse.json({ error: "owns_decks" }, { status: 409 });
  if (me.documents.length || me.tickets.length || me.comments.length) {
    return NextResponse.json({ error: "has_authored_content" }, { status: 409 });
  }

  if (me.memberships.length) await prisma.membership.deleteMany({ where: { studentId: me.id } });
  await prisma.account.deleteMany({ where: { userId: me.id } });
  await prisma.session.deleteMany({ where: { userId: me.id } });
  await prisma.user.delete({ where: { id: me.id } });

  return NextResponse.json({ ok: true });
}
      