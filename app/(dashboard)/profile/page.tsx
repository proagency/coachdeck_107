import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Your Profile — CoachDeck" };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return null;

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, phone: true, accessLevel: true, role: true } });
  if (!me) return null;

  const isAdmin = ((session?.user as any)?.accessLevel === "ADMIN");
const cfg =
  me.role === "COACH" || isAdmin
    ? await prisma.coachPaymentsConfig.upsert({
        where: { coachId: me.id },
        update: {},
        create: { coachId: me.id },
      })
    : null;


  const deletable = (me.accessLevel !== "ADMIN");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <form className="card grid md:grid-cols-2 gap-3" method="post" action="/api/profile">
        <label className="label">Name
          <input className="input" name="name" defaultValue={me.name ?? ""} />
        </label>
        <label className="label">Phone
          <input className="input" name="phone" defaultValue={me.phone ?? ""} />
        </label>
        {(cfg) && (
          <label className="label md:col-span-2">Booking Link (Coach)
            <input className="input" name="bookingUrl" defaultValue={cfg.bookingUrl ?? ""} />
          </label>
        )}
        <div className="md:col-span-2">
          <button className="btn btn-primary">Save</button>
        </div>
      </form>

      {deletable && (
        <form className="card space-y-2" method="post" action="/api/profile">
          <div className="font-medium">Danger zone</div>
          <input type="hidden" name="_method" value="DELETE" />
          <button className="btn">Delete my account</button>
          <div className="text-sm muted">Blocked if you own decks or have authored content.</div>
        </form>
      )}
    </div>
  );
}
