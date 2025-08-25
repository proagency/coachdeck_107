// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendMail } from "@/lib/mailer";

type Body = {
  name?: string | null;
  email?: string;
  phone?: string | null;
  password?: string;
  role?: "COACH";
};

/**
 * Public endpoint:
 * - Creates a COACH user with status=PENDING (requires Super Admin approval)
 * - Hashes password before storing
 * - Notifies active Super Admins via email (if EMAIL_SERVER configured)
 */
export async function POST(req: Request) {
  let data: Body | null = null;
  try {
    data = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = (data?.name || "").toString().trim() || null;
  const emailRaw = (data?.email || "").toString().trim();
  const phone = (data?.phone || "").toString().trim() || null;
  const password = (data?.password || "").toString();

  // Basic validation
  const email = emailRaw.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "weak_password", message: "Password must be at least 8 characters." }, { status: 400 });
  }

  // Prevent duplicate emails
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "email_in_use", message: "An account with this email already exists." },
      { status: 409 }
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create COACH user in PENDING status (UI signup is coach-only)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role: "COACH",
      accessLevel: "USER",
      status: "PENDING",
    },
    select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
  });

  // Notify active Super Admins
  try {
    const supers = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN", status: "ACTIVE" },
      select: { email: true, name: true },
    });

    if (supers.length > 0) {
      const subject = "Coach signup requires approval";
      const msg =
        "A new coach signed up and is pending approval:\n\n" +
        "Name: " + (user.name || "-") + "\n" +
        "Email: " + user.email + "\n" +
        "Role: " + user.role + "\n" +
        "Created: " + user.createdAt.toISOString() + "\n\n" +
        "Approve or deny in the Approvals page.";

      // Send to each super admin; sendMail logs to console if no SMTP configured
      await Promise.all(
        supers
          .filter(s => !!s.email)
          .map(s => sendMail(s.email!, subject, msg))
      );
    }
  } catch (err) {
    // Don't fail the signup if mail fails
    console.warn("[signup] Failed to notify super admins:", err);
  }

  // Do NOT auto-sign-in; Super Admin must approve first
  return NextResponse.json({ ok: true, user }, { status: 201 });
}
