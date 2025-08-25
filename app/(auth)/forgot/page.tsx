import Link from "next/link";
import ForgotForm from "@/components/auth/ForgotForm";

export const metadata = { title: "Forgot Password — CoachDeck" };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <p className="muted text-sm">
        Enter your email and we’ll send you a reset link.
      </p>
      <div className="card">
        <ForgotForm />
      </div>
      <div className="text-sm">
        Remembered it?{" "}
        <Link className="underline" href="/signin">Sign in</Link>
      </div>
    </div>
  );
}
