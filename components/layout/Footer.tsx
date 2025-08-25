import { yearNow } from "@/lib/utils";

export default function Footer() {
  return (
    <footer className="border-t bg-white mt-10">
      <div className="container max-w-6xl p-4 text-sm text-gray-600">
        CoachDeck v1.0.6 {yearNow()}
      </div>
    </footer>
  );
}
      