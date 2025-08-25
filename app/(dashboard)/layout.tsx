import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <main className="mx-auto max-w-7xl p-6 grid grid-cols-12 gap-4">
      <aside className="col-span-12 md:col-span-4 lg:col-span-3">
        <div className="card space-y-2">
          <nav className="space-y-1">
            <a className="btn w-full justify-start" href="/decks">Dashboard</a>
            <a className="btn w-full justify-start" href="/tickets">Tickets</a>
            <a className="btn w-full justify-start" href="/coach/payments">Payments</a>
            <a className="btn w-full justify-start" href="/plans">Plans</a>
            <a className="btn w-full justify-start" href="/profile">Profile</a>
            {(session?.user as any)?.isSuperAdmin ? (
              <a className="btn w-full justify-start" href="/admin/plans">Plan Config</a>
            ) : null}
            {(session?.user as any)?.isSuperAdmin ? (
              <a className="btn w-full justify-start" href="/approvals">Approvals</a>
            ) : null}
          </nav>
        </div>
        <div className="card mt-4">
          {session?.user ? (
            <div className="space-y-2">
              <div className="text-sm">Signed in as <span className="font-medium">{session.user.email}</span></div>
              <form action="/api/auth/signout" method="post">
                <button className="btn w-full">Sign out</button>
              </form>
            </div>
          ) : (
            <form action="/api/auth/signin" method="get" className="space-y-3">
              <div className="label">Login / Create account</div>
              <button className="btn w-full" type="submit">Go to Sign in</button>
            </form>
          )}
        </div>
      </aside>

      <section className="col-span-12 md:col-span-8 lg:col-span-9">
        {children}
      </section>
    </main>
  );
}
