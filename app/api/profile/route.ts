import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isForm = (req.headers.get("content-type") || "").includes("application/x-www-form-urlencoded");
  const raw = isForm
    ? Object.fromEntries((await req.formData()).entries())
    : await req.json().catch(() => ({} as Record<string, unknown>));

  if (raw && typeof raw === "object" && (raw as any)._method === "DELETE") {
    return DELETE(req);
  }

  const name = typeof raw.name === "string" ? raw.name.trim() || null : null;
  const phone = typeof raw.phone === "string" ? raw.phone.trim() || null : null;
  const bookingUrlRaw =
    typeof (raw as any).bookingUrl === "string" ? (raw as any).bookingUrl.trim() : undefined;
  const bookingUrl = bookingUrlRaw === undefined ? undefined : bookingUrlRaw || null; // allow clearing

  // Update basic profile
  const updated = await prisma.user.update({
    where: { email },
    data: { name, phone },
    select: { id: true, email: true, name: true, phone: true, role: true },
  });

  // Only Coaches or Admins can set booking URL (and only if field provided)
  const isAdmin = ((session?.user as any)?.accessLevel === "ADMIN");
  const canSetBooking = updated.role === "COACH" || isAdmin;

  if (canSetBooking && bookingUrl !== undefined) {
    await prisma.coachPaymentsConfig.upsert({
      where: { coachId: updated.id },
      update: { bookingUrl },
      create: { coachId: updated.id, bookingUrl: bookingUrl ?? null },
    });
  }

  return NextResponse.json({ ok: true, user: updated });
}

export async function DELETE(_: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email },
    include: {
      decks: true,
      memberships: true,
      documents: true,
      progress: true,
      tickets: true,
      comments: true,
      accounts: true,
      sessions: true,
    },
  });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Do not allow deleting admin accounts
  if ((session?.user as any)?.accessLevel === "ADMIN" || me.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "cannot_delete_admin" }, { status: 403 });
  }

  // Block if they own a deck or authored content
  if (me.decks.length) return NextResponse.json({ error: "owns_decks" }, { status: 409 });
  if (me.documents.length || me.progress.length || me.tickets.length || me.comments.length) {
    return NextResponse.json({ error: "has_authored_content" }, { status: 409 });
  }

  // Clean up relations then delete user
  if (me.memberships.length) {
    await prisma.membership.deleteMany({ where: { studentId: me.id } });
  }
  await prisma.account.deleteMany({ where: { userId: me.id } });
  await prisma.session.deleteMany({ where: { userId: me.id } });
  await prisma.user.delete({ where: { id: me.id } });

  return NextResponse.json({ ok: true });
}
