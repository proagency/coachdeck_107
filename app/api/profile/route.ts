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
      tickets: true,
      comments: true,
      accounts: true,
      sessions: true,
    },
  });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Block deleting admins / super admins
  if ((session?.user as any)?.accessLevel === "ADMIN" || me.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "cannot_delete_admin" }, { status: 403 });
  }

  // Count progress entries authored by this user (instead of include)
  const progressCount = await prisma.progressEntry.count({ where: { authorId: me.id } });

  // Block if they own a deck or have authored content
  if (me.decks.length) return NextResponse.json({ error: "owns_decks" }, { status: 409 });
  if (
    me.documents.length ||
    progressCount > 0 ||
    me.tickets.length ||
    me.comments.length
  ) {
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
