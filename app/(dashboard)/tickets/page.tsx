import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export const metadata = { title: "Tickets — CoachDeck" };

export default async function TicketsIndex({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "ALL" } = await searchParams;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) {
    return <div className="space-y-4"><h1 className="text-2xl font-semibold">Tickets</h1><p>Please <a className="underline" href="/signin">sign in</a>.</p></div>;
  }
  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return null;

  const isCoach = me.role === "COACH" || (session.user as any).accessLevel === "ADMIN";
  const whereBase: any = isCoach
    ? { deck: { coachId: me.id } }
    : { OR: [{ authorId: me.id }, { deck: { membership: { studentId: me.id } } }] };

  const where = status === "ALL" ? whereBase : { ...whereBase, status: status as any };

  const tickets = await prisma.ticket.findMany({
    where,
    include: { deck: { include: { membership: { include: { student: true } } } }, author: true },
    orderBy: { updatedAt: "desc" },
  });

  const statuses = ["ALL","OPEN","IN_PROGRESS","RESOLVED","CLOSED"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tickets</h1>
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <Link key={s} className={"btn " + (s===status ? "btn-primary" : "")} href={\`/tickets?status=\${s}\`}>{s.replace("_"," ")}</Link>
        ))}
      </div>

      <div className="grid gap-3">
        {tickets.map((t) => (
          <div key={t.id} className="card">
            <div className="flex items-center justify-between">
              <div className="font-medium">{t.title}</div>
              <div className="badge border">{t.status}</div>
            </div>
            <div className="muted text-sm">{t.body}</div>
            <div className="text-xs muted mt-1">
              Deck: {t.deck.name} • Student: {t.deck.membership?.student?.email ?? "—"} • Author: {t.author.email}
            </div>
            <div className="mt-2">
              <a className="btn btn-primary" href={\`/decks/\${t.deckId}\`}>Open Deck</a>
            </div>
          </div>
        ))}
        {tickets.length === 0 && <div className="card muted text-sm">No tickets for this filter.</div>}
      </div>
    </div>
  );
}
