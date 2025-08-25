import SignInForm from "@/components/auth/SignInForm";

export const metadata = { title: "Sign in — CoachDeck" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ email?: string }>}) {
  const { email = "" } = await searchParams;
  return <SignInForm initialEmail={email} />;
}
      