// lib/mailer.ts
import nodemailer from "nodemailer";

type MailArgs = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

export function getTransport() {
  const server = process.env.EMAIL_SERVER; // e.g. smtp://user:pass@smtp.mailgun.org:587
  if (!server) return null;
  return nodemailer.createTransport(server);
}

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  const transport = getTransport();
  const from = process.env.EMAIL_FROM || "CoachDeck <no-reply@localhost>";
  if (!transport) {
    // fallback for dev with no SMTP
    console.log("[mailer] Would send:", { to, subject, text, html });
    return;
  }
  await transport.sendMail({ to, from, subject, text, html: html ?? undefined });
}
