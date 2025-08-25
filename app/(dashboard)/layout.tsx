import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSidebarLinks } from "@/lib/nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user
    ? {
        role: (session.user as any).role as any,
        isSuperAdmin: Boolean((session.user as any).isSuperAdmin),
      }
    : null;

  const links = getSidebarLinks(user);

  return (
    <main className="mx-auto max-w-7xl p-6 grid grid-cols-12 gap-4">
      <aside className="col-span-12 md:col-span-4 lg:col-span-3">
        <div className="card space-y-2">
          <nav className="space-y-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="btn w-full justify-start">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="card mt-4">
          {session?.user ? (
            <div className="space-y-2">
              <div className="text-sm">
                Signed in as <span className="font-medium">{session.user.email}</span>
              </div>
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
