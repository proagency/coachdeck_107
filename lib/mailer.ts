import nodemailer from "nodemailer";

export function getTransport() {
  if (!process.env.EMAIL_SERVER) return null;
  return nodemailer.createTransport(process.env.EMAIL_SERVER);
}
      