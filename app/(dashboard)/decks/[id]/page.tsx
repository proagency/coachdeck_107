import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import TicketActions from "@/components/deck/TicketActions";
import BookingModal from "@/components/BookingModal";

export default async function DeckDetail({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const id = p.id;

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
      progress: { orderBy: { weekStart: "desc" }, take: 4 },
      tickets: {
        orderBy: { createdAt: "desc" },
        include: { comments: { orderBy: { createdAt: "asc" } }, author: true },
      },
    },
  });
  if (!deck) return notFound();

  const isStudent = deck.membership?.studentId === me.id;
  const canUpdateStatus = deck.coachId === me.id || Boolean((session?.user as any)?.accessLevel === "ADMIN");

  // Pull coach payments config to show booking link (if configured)
  const coachCfg = await prisma.coachPaymentsConfig.findUnique({ where: { coachId: deck.coachId } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{deck.name}</h1>
        <a className="btn" href="/decks">Back</a>
      </div>

      {/* Who’s who + quick create ticket for student */}
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
              <button className="btn btn-primary">Create</button>
            </form>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Tickets */}
        <div className="md:col-span-2 card">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Tickets</div>
            <a href="/tickets" className="text-sm underline">Back to tickets</a>
          </div>
          <ul className="space-y-3">
            {deck.tickets.map((t) => (
              <li key={t.id} className="border rounded-[3px] p-3">
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

        {/* Docs + Progress + Booking */}
        <div className="space-y-4">
          <div className="card">
            <div className="font-medium mb-2">Documents</div>
            <ul className="text-sm list-disc ml-4 mt-2">
              {deck.documents.map((d) => (
                <li key={d.id}>{d.url ? <a className="underline" href={d.url} target="_blank">{d.title}</a> : d.title}</li>
              ))}
            </ul>
            {deck.documents.length === 0 && <div className="muted text-sm">No documents yet.</div>}
          </div>

          <div className="card">
            <div className="font-medium mb-2">Recent Progress</div>
            <ul className="text-sm list-disc ml-4">
              {deck.progress.map((p) => (<li key={p.id}>{new Date(p.weekStart).toDateString()} — {p.summary}</li>))}
            </ul>
            {deck.progress.length === 0 && <div className="muted text-sm">No progress entries yet.</div>}
          </div>

          {/* Booking button for students if coach configured bookingUrl */}
          {isStudent && (coachCfg as any)?.bookingUrl ? (
            <div className="card">
              <div className="font-medium mb-2">Book an appointment</div>
              <BookingModal url={(coachCfg as any).bookingUrl} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
