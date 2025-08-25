import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Update profile (name/phone) and optionally coach bookingUrl (if provided).
 * Also supports form fallback with _method=DELETE to route to DELETE handler.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isForm = (req.headers.get("content-type") || "").includes("application/x-www-form-urlencoded");
  const data = isForm ? Object.fromEntries((await req.formData()).entries()) : await req.json().catch(() => ({} as any));

  // Form fallback to delete
  if ((data as any)._method === "DELETE") return DELETE(req);

  const name = typeof data.name === "string" ? data.name.trim() || null : null;
  const phone = typeof data.phone === "string" ? data.phone.trim() || null : null;
  const bookingUrl =
    typeof data.bookingUrl === "string" && data.bookingUrl.trim() ? data.bookingUrl.trim() : null;

  const me = await prisma.user.update({ where: { email }, data: { name, phone } });

  // If coach provided a booking URL, persist it in coach payments config
  if (bookingUrl !== null && me.role === "COACH") {
    await prisma.coachPaymentsConfig.upsert({
      where: { coachId: me.id },
      update: { bookingUrl },
      create: { coachId: me.id, bookingUrl },
    });
  }

  return NextResponse.json({
    ok: true,
    user: { id: me.id, name: me.name, phone: me.phone },
  });
}

/**
 * Delete account (blocked for admins/super admins or if owning content)
 */
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
    },
  });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Prevent deleting privileged accounts
  const isAdmin = ((session?.user as any)?.accessLevel === "ADMIN") || me.role === "SUPER_ADMIN";
  if (isAdmin) return NextResponse.json({ error: "cannot_delete_admin" }, { status: 403 });

  if (me.decks.length) return NextResponse.json({ error: "owns_decks" }, { status: 409 });
  if (me.documents.length || me.progress.length || me.tickets.length || me.comments.length) {
    return NextResponse.json({ error: "has_authored_content" }, { status: 409 });
  }

  // Clean up relations
  if (me.memberships.length) await prisma.membership.deleteMany({ where: { studentId: me.id } });
  await prisma.account.deleteMany({ where: { userId: me.id } });
  await prisma.session.deleteMany({ where: { userId: me.id } });

  await prisma.user.delete({ where: { id: me.id } });

  return NextResponse.json({ ok: true });
}
