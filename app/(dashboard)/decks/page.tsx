import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "Your Decks — CoachDeck" };

export default async function DecksPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Your Decks</h1>
        <p>
          Please <a className="underline" href="/signin">sign in</a> to view your decks.
        </p>
      </div>
    );
  }

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return null;

  const decks = await prisma.deck.findMany({
    where: { OR: [{ coachId: me.id }, { membership: { studentId: me.id } }] },
    include: { membership: { include: { student: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Your Decks</h1>
      <ul className="grid gap-3 md:grid-cols-2">
        {decks.map((d) => (
          <li key={d.id} className="card">
            <div className="font-medium">{d.name}</div>
            <div className="text-sm muted">
              {d.membership?.student
                ? "Student: " + (d.membership.student.email || "")
                : "No student yet"}
            </div>
            <div className="mt-3">
              <a className="btn btn-primary" href={"/decks/" + d.id}>Open</a>
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
