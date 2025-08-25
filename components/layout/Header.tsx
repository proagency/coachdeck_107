import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container max-w-6xl p-4 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">CoachDeck</Link>
        <button
          className="btn btn-primary"
          onClick={() => (window as any).dispatchEvent(new CustomEvent("open-user-menu"))}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="8" r="4" stroke="currentColor"></circle>
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor"></path>
          </svg>
          Menu
        </button>
      </div>
    </header>
  );
}
      