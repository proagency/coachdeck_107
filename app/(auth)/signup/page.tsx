import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";

export const metadata = { title: "Sign up — CoachDeck" };

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Coach Sign Up</h1>
      <p className="muted text-sm">
        Create a coach account. A Super Admin will review and approve your access.
      </p>
      <div className="card">
        <SignupForm />
      </div>
      <div className="text-sm">
        Already have an account?{" "}
        <Link className="underline" href="/signin">Sign in</Link>
      </div>
    </div>
  );
}
