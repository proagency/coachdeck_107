import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CreateDeckModal from "@/components/deck/CreateDeckModal";

export const metadata = { title: "Your Decks — CoachDeck" };

export default async function DecksPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Your Decks</h1>
        <p>
          Please{" "}
          <Link className="underline" href="/signin">
            sign in
          </Link>{" "}
          to view your decks.
        </p>
      </div>
    );
  }

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, accessLevel: true },
  });
  if (!me) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Your Decks</h1>
        <p className="muted text-sm">Account not found.</p>
      </div>
    );
  }

  // Strict isolation: only decks you coach or where you are the student
  const decks = await prisma.deck.findMany({
    where: {
      OR: [{ coachId: me.id }, { membership: { studentId: me.id } }],
    },
    include: {
      membership: { include: { student: { select: { email: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN" || me.role === "SUPER_ADMIN";
  const isCoach = me.role === "COACH";
  const canCreateDeck = isCoach || isAdmin; // UI: only coaches/admin can create decks

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Your Decks</h1>
        {canCreateDeck ? <CreateDeckModal /> : null}
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {decks.map((d) => (
          <li key={d.id} className="card">
            <div className="font-medium">{d.name}</div>
            <div className="text-sm muted">
              {d.membership?.student?.email
                ? "Student: " + d.membership.student.email
                : "No student yet"}
            </div>
            <div className="mt-3">
              <a className="btn btn-primary" href={"/decks/" + d.id}>
                Open
              </a>
            </div>
          </li>
        ))}
        {decks.length === 0 && (
          <li className="card">
            <div className="muted text-sm">No decks yet.</div>
          </li>
        )}
      </ul>
    </div>
  );
}
