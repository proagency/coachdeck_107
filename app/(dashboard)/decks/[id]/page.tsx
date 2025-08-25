import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import StudentPlanCards from "@/components/plans/StudentPlanCards";

export const metadata = { title: "Deck — CoachDeck" };

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
      tickets: { orderBy: { createdAt: "desc" }, include: { author: true, comments: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!deck) return notFound();

  const isStudent = deck.membership?.studentId === me.id;

  // Coach payment config (channels) and active plans
  const payCfg = await prisma.coachPaymentsConfig.upsert({
    where: { coachId: deck.coachId },
    update: {},
    create: { coachId: deck.coachId },
  });

  const plans = await prisma.paymentPlan.findMany({
    where: { coachId: deck.coachId, active: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, type: true, amount: true, currency: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{deck.name}</h1>
        <Link className="btn" href="/decks">Back</Link>
      </div>

      {/* Who's who */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="font-medium">Coach</div>
          <div className="muted">{deck.coach?.email || "-"}</div>
        </div>
        <div className="card">
          <div className="font-medium">Student</div>
          <div className="muted">{deck.membership?.student?.email || "No student yet"}</div>
        </div>
        <div className="card">
          <div className="font-medium">Create Ticket</div>
          {isStudent ? (
            <form className="space-y-2" method="post" action="/api/tickets">
              <input type="hidden" name="deckId" value={deck.id} />
              <input className="input" name="title" placeholder="Title" required />
              <textarea className="input" name="body" placeholder="Describe the issue…" required />
              <button className="btn btn-primary">Create</button>
            </form>
          ) : (
            <div className="muted text-sm">Only the student can create tickets.</div>
          )}
        </div>
      </div>

      {/* Tickets */}
      <div className="card">
        <div className="font-medium mb-2">Tickets</div>
        <ul className="space-y-3">
          {deck.tickets.map(function(t){
            return (
              <li key={t.id} className="border rounded-[3px] p-3">
                <div className="font-medium">{t.title}</div>
                <div className="text-sm muted">{t.body}</div>
                <div className="text-xs mt-1 muted">{"by " + (t.author?.email || "-") + " — " + t.status}</div>
                <ul className="mt-2 text-sm space-y-1">
                  {t.comments.map(function(c){ return (<li key={c.id} className="muted">{"↳ " + c.body}</li>); })}
                </ul>
              </li>
            );
          })}
          {deck.tickets.length === 0 && <li className="muted text-sm">No tickets yet.</li>}
        </ul>
      </div>

      {/* Documents */}
      <div className="card">
        <div className="font-medium mb-2">Documents</div>
        {deck.documents.length === 0 ? (
          <div className="muted text-sm">No documents yet.</div>
        ) : (
          <ul className="text-sm list-disc ml-4 mt-2">
            {deck.documents.map(function(d){
              return (
                <li key={d.id}>
                  {d.url ? <a className="underline" href={d.url} target="_blank" rel="noreferrer">{d.title}</a> : d.title}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Student can buy coach plans directly */}
      {isStudent && plans.length > 0 && (
        <div className="card">
          <div className="font-medium mb-2">Plans from your coach</div>
          <StudentPlanCards
            coachEmail={String(deck.coach?.email || "")}
            coachId={deck.coachId}
            enableBank={Boolean((payCfg as any).enableBank)}
            enableEwallet={Boolean((payCfg as any).enableEwallet)}
            plans={plans as any}
          />
        </div>
      )}

    </div>
  );
}
