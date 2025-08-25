import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import TicketActions from "@/components/deck/TicketActions";
import { DocCreateForm } from "@/components/deck/DocCreateForm";
import BookingModal from "@/components/common/BookingModal";

export const metadata = { title: "Deck — CoachDeck" };

export default async function DeckDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return notFound();

  const deck = await prisma.deck.findFirst({
    where: { id, OR: [{ coachId: me.id }, { membership: { studentId: me.id } }] },
    include: {
      coach: true,
      membership: { include: { student: true } },
      documents: true,
      tickets: {
        orderBy: { createdAt: "desc" },
        include: { comments: { orderBy: { createdAt: "asc" } }, author: true },
      },
    },
  });
  if (!deck) return notFound();

  const canUpdateStatus = deck.coachId === me.id || (session.user as any).accessLevel === "ADMIN";
  const isStudent = deck.membership?.studentId === me.id;

  // Booking link from coach payments config
  const coachCfg = await prisma.coachPaymentsConfig.findUnique({ where: { coachId: deck.coachId } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{deck.name}</h1>
        <a className="btn" href="/decks">Back</a>
      </div>

      {/* Who's who + Create Ticket (student only) */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="font-medium">Coach</div>
          <div className="muted">{deck.coach.email}</div>
        </div>
        <div className="card">
          <div className="font-medium">Student</div>
          <div className="muted">{deck.membership?.student?.email ?? "No student yet"}</div>
        </div>
        {isStudent && (
          <div className="card">
            <div className="font-medium">Create Ticket</div>
            <form className="space-y-2" method="post" action="/api/tickets">
              <input type="hidden" name="deckId" value={deck.id} />
              <input className="input" name="title" placeholder="Title" required />
              <textarea className="input" name="body" placeholder="Describe the issue…" required />
              <button className="btn btn-primary" type="submit">Create</button>
            </form>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Tickets */}
        <div className="md:col-span-2 card">
          <div className="font-medium mb-2">Tickets</div>
          <ul className="space-y-3">
            {deck.tickets.map((t) => (
              <li key={t.id} className="border rounded p-3">
                <div className="font-medium">{t.title}</div>
                <div className="text-sm muted">{t.body}</div>
                <div className="text-xs mt-1 muted">by {t.author.email} — {t.status}</div>
                <ul className="mt-2 text-sm space-y-1">
                  {t.comments.map((c) => (<li key={c.id} className="muted">↳ {c.body}</li>))}
                </ul>
                <TicketActions ticketId={t.id} current={t.status as any} canUpdateStatus={canUpdateStatus} />
              </li>
            ))}
            {deck.tickets.length === 0 && <li className="muted text-sm">No tickets yet.</li>}
          </ul>
        </div>

        {/* Docs + Booking */}
        <div className="space-y-4">
          <div className="card">
            <div className="font-medium mb-2">Documents</div>
            {canUpdateStatus && <DocCreateForm deckId={deck.id} />}
            <ul className="text-sm list-disc ml-4 mt-2">
              {deck.documents.map((d) => (
                <li key={d.id}>
                  {d.url ? <a className="underline" href={d.url} target="_blank">{d.title}</a> : d.title}
                </li>
              ))}
              {deck.documents.length === 0 && <li className="muted">No documents yet.</li>}
            </ul>
          </div>

          {isStudent && coachCfg?.bookingUrl && (
            <div className="card">
              <div className="font-medium mb-2">Book an appointment</div>
              <BookingModal url={coachCfg.bookingUrl} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
