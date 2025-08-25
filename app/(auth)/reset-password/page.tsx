import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Reset Password — CoachDeck" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string, email?: string }>}) {
  const { token = "", email = "" } = await searchParams;
  return <ResetPasswordForm token={token} initialEmail={email} />;
}
      