import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "Tickets — CoachDeck" };

export default async function TicketsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p>
          Please <a className="underline" href="/signin">sign in</a> to view tickets.
        </p>
      </div>
    );
  }

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return null;

  // Coach: tickets in their decks. Student: their own or in their deck.
  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { authorId: me.id },
        { assignedToId: me.id },
        { deck: { coachId: me.id } },
        { deck: { membership: { studentId: me.id } } },
      ],
    },
    include: {
      deck: true,
      author: true,
      comments: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tickets</h1>
      <ul className="space-y-3">
        {tickets.map((t) => (
          <li key={t.id} className="card">
            <div className="font-medium">{t.title}</div>
            <div className="text-sm muted">
              Deck: {t.deck?.name || ""} — by {t.author?.email || ""} — {t.status}
            </div>
            <div className="mt-2 text-sm">{t.body}</div>
            {t.comments.length > 0 && (
              <ul className="mt-2 text-sm space-y-1">
                {t.comments.map((c) => (
                  <li key={c.id} className="muted">↳ {c.body}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
        {tickets.length === 0 && (
          <li className="card">
            <div className="muted text-sm">No tickets yet.</div>
          </li>
        )}
      </ul>
    </div>
  );
}
