import { getTransport } from "./mailer";

export async function sendMail(to: string, subject: string, text: string) {
  const t = getTransport();
  if (!t) {
    console.log("[DEV email]", { to, subject, text });
    return;
  }
  await t.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
}
      