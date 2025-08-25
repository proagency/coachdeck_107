import SignInForm from "@/components/auth/SignInForm";

export const metadata = { title: "Sign in — CoachDeck" };

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-center">Sign in</h1>
      <SignInForm />
    </div>
  );
}
