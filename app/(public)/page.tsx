import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Video16x9 from "@/components/common/Video16x9";
import Link from "next/link";

export const metadata = { title: "CoachDeck — Home" };

export default async function Landing() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/decks");

  return (
    <div className="space-y-12">
      <section className="text-center space-y-6">
        <h1 className="text-3xl font-bold">CoachDeck</h1>
        <p className="muted max-w-2xl mx-auto">A minimalist 1:1 coaching workspace: decks, tickets, documents, and payments—built for coaches and students.</p>
        <Video16x9 src="https://www.youtube.com/embed/dQw4w9WgXcQ" />
        <div className="mt-6">
          <Link className="btn btn-primary" href="/signin">Get Started for Free</Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="card space-y-2">
          <div className="font-medium">Create Decks</div>
          <div className="muted text-sm">1 coach ↔ 1 student, with strict isolation.</div>
          <Link className="btn btn-primary" href="/signin">Get Started for Free</Link>
        </div>
        <div className="card space-y-2">
          <div className="font-medium">Track Tickets</div>
          <div className="muted text-sm">Micro-consultations with statuses and replies.</div>
          <Link className="btn btn-primary" href="/signin">Get Started for Free</Link>
        </div>
        <div className="card space-y-2">
          <div className="font-medium">Share Docs</div>
          <div className="muted text-sm">Coach-managed working doc URL, student view-only.</div>
          <Link className="btn btn-primary" href="/signin">Get Started for Free</Link>
        </div>
      </section>
    </div>
  );
}
      