import "./../styles/globals.css";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import UserMenu from "@/components/ui/UserMenu";
import Toaster from "@/components/ui/Toaster";

export const metadata = { title: "CoachDeck", description: "Minimal 1:1 coaching workspace" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const role = (session?.user as any)?.role as any;
  const accessLevel = (session?.user as any)?.accessLevel as any;

  return (
    <html lang="en">
      <body className="bg-gray-50">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-7xl p-4 flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg">CoachDeck</Link>
            <UserMenu email={email} role={role} accessLevel={accessLevel} />
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-6 grid grid-cols-12 gap-4">
          {/* left sidebar remains server-rendered */}
          <aside className="col-span-12 md:col-span-4 lg:col-span-3">
            {/* ... your existing server-only sidebar content (no onClick here) ... */}
          </aside>
          <section className="col-span-12 md:col-span-8 lg:col-span-9">
            {children}
          </section>
        </main>

        {/* global toasts */}
        <Toaster />
      </body>
    </html>
  );
}
