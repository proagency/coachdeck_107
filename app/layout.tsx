import "./../styles/globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Toaster from "@/components/ui/Toaster";
import UserMenuModal from "@/components/layout/UserMenuModal";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "CoachDeck", description: "Minimal coaching workspace" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="container max-w-6xl p-6 min-h-[70vh]">
          {children}
        </main>
        <Footer />
        <UserMenuModal session={session} />
        <Toaster />
      </body>
    </html>
  );
}
      