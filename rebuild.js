// builder.js (Part 3/3 — API routes)
// Run: node builder.js 3

import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;

const part = process.argv[2] || "3";

async function writeFileRecursive(filePath, content) {
  const full = join(root, filePath);
  await fs.mkdir(dirname(full), { recursive: true });
  await fs.writeFile(full, content);
}

async function main() {
  if (part !== "3") {
    console.log("This is Part 3. Run: node builder.js 3");
    return;
  }

  const files = [
    // -------------------------------------------
    // /api/decks : coach creates deck + student (temp password)
    // -------------------------------------------
    {
      path: "app/api/decks/route.ts",
      content: String.raw`
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendMail } from "@/lib/notify";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const coach = await prisma.user.findUnique({ where: { email } });
  if (!coach || (coach.role !== "COACH" && session?.user?.accessLevel !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const studentEmail = String(body?.studentEmail || "").trim().toLowerCase();
  if (!name || !studentEmail) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  // student account (create if missing)
  let student = await prisma.user.findUnique({ where: { email: studentEmail } });
  let tempPass = "";
  if (!student) {
    tempPass = Math.random().toString(36).slice(2, 10);
    const hash = await bcrypt.hash(tempPass, 10);
    student = await prisma.user.create({
      data: {
        email: studentEmail,
        role: "STUDENT",
        status: "ACTIVE",
        passwordHash: hash
      }
    });
    // email student credentials
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    await sendMail(
      studentEmail,
      "Welcome to CoachDeck",
      [
        "You've been invited to a deck by your coach.",
        \`URL: \${base}\`,
        \`Email: \${studentEmail}\`,
        \`Temporary Password: \${tempPass}\`,
        "",
        "Please sign in and change your password."
      ].join("\\n")
    );
  }

  // create deck + membership
  const deck = await prisma.deck.create({
    data: {
      name,
      coachId: coach.id,
      membership: { create: { studentId: student.id } }
    },
    include: { membership: { include: { student: true } } }
  });

  return NextResponse.json({ deck }, { status: 201 });
}
      `.trimStart(),
    },

    // -------------------------------------------
    // /api/tickets : create ticket (student-only UI, server allows coach/admin too)
    // -------------------------------------------
    {
      path: "app/api/tickets/route.ts",
      content: String.raw`
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // form or json
  const content = req.headers.get("content-type") || "";
  const raw = content.includes("application/x-www-form-urlencoded")
    ? Object.fromEntries((await req.formData()).entries())
    : await req.json().catch(() => ({}));

  const deckId = String(raw.deckId || "");
  const title = String(raw.title || "");
  const body = String(raw.body || "");
  if (!deckId || !title || !body) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // must belong to deck (coach or student)
  const deck = await prisma.deck.findFirst({
    where: { id: deckId, OR: [{ coachId: me.id }, { membership: { studentId: me.id } }] },
    include: { coach: true, membership: { include: { student: true } } }
  });
  if (!deck) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ticket = await prisma.ticket.create({
    data: { deckId: deck.id, authorId: me.id, title, body }
  });

  // notify coach on new ticket
  await sendMail(deck.coach.email || "", "New Ticket Created", \`Title: \${title}\\nDeck: \${deck.name}\\nBy: \${email}\`);

  // If classic form submission, redirect back to deck page
  if (content.includes("application/x-www-form-urlencoded")) {
    return new NextResponse(null, { status: 303, headers: { Location: \`/decks/\${deck.id}\` } });
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
      `.trimStart(),
    },

    // -------------------------------------------
    // /api/tickets/[id]/comments : add reply + notify student
    // -------------------------------------------
    {
      path: "app/api/tickets/[id]/comments/route.ts",
      content: String.raw`
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/notify";

export async function POST(req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { body } = await req.json().catch(()=>({}));
  if (!body || typeof body !== "string") return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const id = String(ctx?.params?.id || "");
  // Ensure membership to ticket's deck
  const can = await prisma.ticket.findFirst({
    where: {
      id,
      OR: [
        { authorId: me.id },
        { assignedToId: me.id },
        { deck: { coachId: me.id } },
        { deck: { membership: { studentId: me.id } } }
      ]
    },
    include: { deck: { include: { membership: { include: { student: true } }, coach: true } }, author: true }
  });
  if (!can) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const comment = await prisma.ticketComment.create({ data: { ticketId: id, authorId: me.id, body } });

  // notify student on new reply
  const studentEmail = can.deck.membership?.student?.email || "";
  if (studentEmail) {
    await sendMail(
      studentEmail,
      "Ticket Reply",
      \`Your ticket: "\${can.title}" has a new reply by \${email}:\\n\\n\${body}\`
    );
  }

  return NextResponse.json({ comment }, { status: 201 });
}
      `.trimStart(),
    },

    // -------------------------------------------
    // /api/tickets/[id]/status : coach/superadmin only + notify student
    // -------------------------------------------
    {
      path: "app/api/tickets/[id]/status/route.ts",
      content: String.raw`
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/notify";

export async function PATCH(req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { status } = await req.json().catch(()=>({}));
  if (!["OPEN","IN_PROGRESS","RESOLVED","CLOSED"].includes(String(status))) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const id = String(ctx?.params?.id || "");
  const t = await prisma.ticket.findUnique({ where: { id }, include: { deck: { include: { membership: { include: { student: true } }, coach: true } } } });
  if (!t) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isAdmin = (session.user as any).accessLevel === "ADMIN";
  const isCoach = t.deck.coachId === me.id;
  if (!isAdmin && !isCoach) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const updated = await prisma.ticket.update({ where: { id }, data: { status } });

  // notify student on status change
  const studentEmail = t.deck.membership?.student?.email || "";
  if (studentEmail) {
    await sendMail(
      studentEmail,
      "Ticket Status Updated",
      \`Your ticket status changed to \${status} for deck "\${t.deck.name}".\`
    );
  }

  return NextResponse.json({ ticket: updated });
}
      `.trimStart(),
    },

    // -------------------------------------------
    // /api/documents : coach/admin adds a document to deck
    // -------------------------------------------
    {
      path: "app/api/documents/route.ts",
      content: String.raw`
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { deckId, title, url } = await req.json().catch(()=>({}));
  if (!deckId || !title) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const isAdmin = (session.user as any).accessLevel === "ADMIN";
  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck) return NextResponse.json({ error: "deck_not_found" }, { status: 404 });
  if (!isAdmin && deck.coachId !== me.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const doc = await prisma.document.create({
    data: { deckId: deck.id, title: String(title), url: url ? String(url) : null, createdById: me.id },
  });
  return NextResponse.json({ document: doc }, { status: 201 });
}
      `.trimStart(),
    },

    // -------------------------------------------
    // /api/profile : POST update (name/phone/bookingUrl), DELETE account
    // -------------------------------------------
    {
      path: "app/api/profile/route.ts",
      content: String.raw`
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isForm = req.headers.get("content-type")?.includes("application/x-www-form-urlencoded");
  const data: any = isForm ? Object.fromEntries((await req.formData()).entries()) : await req.json().catch(() => ({}));
  if (data._method === "DELETE") return DELETE(req);

  const name = (data.name ?? "").toString().trim() || null;
  const phone = (data.phone ?? "").toString().trim() || null;
  const bookingUrl = (data.bookingUrl ?? "").toString().trim() || null;

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Save user
  const updated = await prisma.user.update({ where: { id: me.id }, data: { name, phone } });

  // If coach/admin and bookingUrl provided, upsert coach config
  const canSetBooking = updated.role === "COACH" || (session.user as any).accessLevel === "ADMIN";
  if (canSetBooking && bookingUrl !== null) {
    await prisma.coachPaymentsConfig.upsert({
      where: { coachId: updated.id },
      update: { bookingUrl },
      create: { coachId: updated.id, bookingUrl }
    });
  }

  return NextResponse.json({ ok: true, user: { id: updated.id, name: updated.name, phone: updated.phone } });
}

export async function DELETE(_: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email }, include: {
    decks: true, memberships: true, documents: true, tickets: true, comments: true,
  }});
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (me.accessLevel === "ADMIN") return NextResponse.json({ error: "cannot_delete_admin" }, { status: 403 });
  if (me.decks.length) return NextResponse.json({ error: "owns_decks" }, { status: 409 });
  if (me.documents.length || me.tickets.length || me.comments.length) {
    return NextResponse.json({ error: "has_authored_content" }, { status: 409 });
  }

  if (me.memberships.length) await prisma.membership.deleteMany({ where: { studentId: me.id } });
  await prisma.account.deleteMany({ where: { userId: me.id } });
  await prisma.session.deleteMany({ where: { userId: me.id } });
  await prisma.user.delete({ where: { id: me.id } });

  return NextResponse.json({ ok: true });
}
      `.trimStart(),
    },

    // -------------------------------------------
    // /api/approvals : Super Admin approves/rejects coach signups
    // -------------------------------------------
    {
      path: "app/api/approvals/route.ts",
      content: String.raw`
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/notify";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  const isAdmin = (session.user as any).accessLevel === "ADMIN" || me?.role === "SUPER_ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id, action } = await req.json().catch(()=>({}));
  if (!id || !["APPROVE","REJECT"].includes(String(action))) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "COACH") return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (action === "APPROVE") {
    await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
    if (user.email) await sendMail(user.email, "CoachDeck — Approved", "Your coach account is approved. You can now sign in.");
  } else {
    await prisma.user.update({ where: { id }, data: { status: "DISABLED" } });
    if (user.email) await sendMail(user.email, "CoachDeck — Rejected", "Your coach account request was rejected.");
  }

  return NextResponse.json({ ok: true });
}
      `.trimStart(),
    },

    // -------------------------------------------
    // Coach Payments: toggles (enableBank, enableEwallet, bookingUrl)
    // -------------------------------------------
    {
      path: "app/api/coach/payments/toggles/route.ts",
      content: String.raw`
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { enableBank, enableEwallet, bookingUrl } = await req.json().catch(()=>({}));

  const cfg = await prisma.coachPaymentsConfig.upsert({
    where: { coachId: me.id },
    update: {
      enableBank: !!enableBank,
      enableEwallet: !!enableEwallet,
      ...(typeof bookingUrl === "string" ? { bookingUrl } : {})
    },
    create: {
      coachId: me.id,
      enableBank: !!enableBank,
      enableEwallet: !!enableEwallet,
      ...(typeof bookingUrl === "string" ? { bookingUrl } : {})
    }
  });

  return NextResponse.json({ ok: true, config: cfg });
}
      `.trimStart(),
    },

    // -------------------------------------------
    // Coach Payments: banks (POST, DELETE)
    // -------------------------------------------
    {
      path: "app/api/coach/payments/banks/route.ts",
      content: String.raw`
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const j = await req.json().catch(()=>null);
  if (!j?.bankName || !j?.accountName || !j?.accountNumber) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const bank = await prisma.coachBankAccount.create({
    data: {
      bankName: String(j.bankName),
      accountName: String(j.accountName),
      accountNumber: String(j.accountNumber),
      branch: j.bankBranch ? String(j.bankBranch) : null,
      coach: { connect: { id: me.id } }
    }
  });
  return NextResponse.json({ bank }, { status: 201 });
}
      `.trimStart(),
    },
    {
      path: "app/api/coach/payments/banks/[id]/route.ts",
      content: String.raw`
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = String(ctx?.params?.id || "");
  const rec = await prisma.coachBankAccount.findFirst({ where: { id, coachId: me.id } });
  if (!rec) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.coachBankAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
      `.trimStart(),
    },

    // -------------------------------------------
    // Coach Payments: ewallets (POST, DELETE)
    // -------------------------------------------
    {
      path: "app/api/coach/payments/ewallets/route.ts",
      content: String.raw`
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const j = await req.json().catch(()=>null);
  if (!j?.provider || !j?.handle) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const wallet = await prisma.coachEwallet.create({
    data: {
      provider: String(j.provider),
      handle: String(j.handle),
      coach: { connect: { id: me.id } }
    }
  });
  return NextResponse.json({ wallet }, { status: 201 });
}
      `.trimStart(),
    },
    {
      path: "app/api/coach/payments/ewallets/[id]/route.ts",
      content: String.raw`
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = String(ctx?.params?.id || "");
  const rec = await prisma.coachEwallet.findFirst({ where: { id, coachId: me.id } });
  if (!rec) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.coachEwallet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
      `.trimStart(),
    },

    // -------------------------------------------
    // Coach Payments: plans (POST, PATCH, DELETE)
    // -------------------------------------------
    {
      path: "app/api/coach/payments/plans/route.ts",
      content: String.raw`
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const j = await req.json().catch(()=>null);
  if (!j?.name || !j?.type || typeof j.amount !== "number") return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const plan = await prisma.paymentPlan.create({
    data: {
      coach: { connect: { id: me.id } },
      name: String(j.name),
      description: j.description ? String(j.description) : null,
      type: j.type === "SUBSCRIPTION" ? "SUBSCRIPTION" : "ONE_TIME",
      amount: Math.max(0, Math.floor(j.amount)),
      currency: j.currency ? String(j.currency) : "PHP",
      active: j.active === false ? false : true
    }
  });

  return NextResponse.json({ plan }, { status: 201 });
}
      `.trimStart(),
    },
    {
      path: "app/api/coach/payments/plans/[id]/route.ts",
      content: String.raw`
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = String(ctx?.params?.id || "");
  const plan = await prisma.paymentPlan.findFirst({ where: { id, coachId: me.id } });
  if (!plan) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const j = await req.json().catch(()=>({}));

  const updated = await prisma.paymentPlan.update({
    where: { id },
    data: {
      ...(typeof j.name === "string" ? { name: j.name } : {}),
      ...(typeof j.description === "string" ? { description: j.description } : {}),
      ...(typeof j.amount === "number" ? { amount: Math.max(0, Math.floor(j.amount)) } : {}),
      ...(typeof j.currency === "string" ? { currency: j.currency } : {}),
      ...(typeof j.type === "string" && (j.type==="ONE_TIME" || j.type==="SUBSCRIPTION") ? { type: j.type } : {}),
      ...(typeof j.active === "boolean" ? { active: j.active } : {})
    }
  });

  return NextResponse.json({ plan: updated });
}

export async function DELETE(_req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = String(ctx?.params?.id || "");
  const plan = await prisma.paymentPlan.findFirst({ where: { id, coachId: me.id } });
  if (!plan) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.paymentPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
      `.trimStart(),
    },

    // -------------------------------------------
    // Student invoices: create from plan, status update (coach), proof upload
    // -------------------------------------------
    {
      path: "app/api/invoices/route.ts",
      content: String.raw`
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "STUDENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const j = await req.json().catch(()=>null);
  const planId = String(j?.planId || "");
  const channel = j?.channel === "E_WALLET" ? "E_WALLET" : "BANK";
  if (!planId) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const plan = await prisma.paymentPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) return NextResponse.json({ error: "plan_not_found" }, { status: 404 });

  // Determine coach-student relationship via any membership with this coach
  const mem = await prisma.membership.findFirst({
    where: { studentId: me.id, deck: { coachId: plan.coachId } },
    include: { deck: true }
  });
  if (!mem) return NextResponse.json({ error: "no_relationship_with_coach" }, { status: 403 });

  const invoice = await prisma.invoice.create({
    data: {
      planId: plan.id,
      coachId: plan.coachId,
      studentId: me.id,
      channel,
      amount: plan.amount,
      currency: plan.currency,
      title: plan.name,
      description: plan.description || null
    }
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
      `.trimStart(),
    },
    {
      path: "app/api/invoices/[id]/status/route.ts",
      content: String.raw`
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const id = String(ctx?.params?.id || "");
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // only owning coach or admin can change
  const isAdmin = (session.user as any).accessLevel === "ADMIN";
  if (!isAdmin && inv.coachId !== me.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { status } = await req.json().catch(()=>({}));
  const allowed = ["PENDING","SUBMITTED","UNDER_REVIEW","PAID","REJECTED","CANCELED"];
  if (!allowed.includes(String(status))) return NextResponse.json({ error: "invalid_status" }, { status: 400 });

  const updated = await prisma.invoice.update({ where: { id }, data: { status } });
  return NextResponse.json({ invoice: updated });
}
      `.trimStart(),
    },
    {
      path: "app/api/invoices/[id]/upload/route.ts",
      content: String.raw`
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { promises as fs } from "node:fs";
import { join } from "node:path";

export async function POST(req: Request, ctx: any) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "STUDENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = String(ctx?.params?.id || "");
  const inv = await prisma.invoice.findFirst({ where: { id, studentId: me.id } });
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as unknown as File | null;
  if (!file) return NextResponse.json({ error: "file_required" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 10 * 1024 * 1024) return NextResponse.json({ error: "file_too_large" }, { status: 400 });

  const dir = join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const filename = \`\${id}-\${Date.now()}-\${file.name?.replace(/[^a-zA-Z0-9\\._-]/g,"_") || "proof"}\`;
  const full = join(dir, filename);
  await fs.writeFile(full, buf);

  const url = "/uploads/" + filename;
  const updated = await prisma.invoice.update({ where: { id }, data: { proofUrl: url, status: "SUBMITTED" } });

  return NextResponse.json({ invoice: updated });
}
      `.trimStart(),
    },

    // -------------------------------------------
    // /api/checkout : call Make.com webhook to get payment_url
    // -------------------------------------------
    {
      path: "app/api/checkout/route.ts",
      content: String.raw`
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const j = await req.json().catch(()=>null);
  if (!j?.planName || !j?.firstName || !j?.lastName || !j?.email || !j?.amount) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const payload = {
    "Plan Name": String(j.planName),
    "First Name": String(j.firstName),
    "Last Name": String(j.lastName),
    "Email": String(j.email),
    "Mobile Number in e164 (PH)": String(j.mobile || ""),
    "Amount": Number(j.amount)
  };

  const url = process.env.MAKE_CHECKOUT_WEBHOOK;
  if (!url) return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });

  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) {
    const txt = await r.text().catch(()=> "");
    return NextResponse.json({ error: "webhook_failed", detail: txt }, { status: 502 });
  }
  const data = await r.json().catch(()=> ({}));
  const payment_url = data?.payment_url || data?.invoice_url || data?.url || null;

  if (!payment_url) return NextResponse.json({ error: "no_payment_url" }, { status: 502 });

  return NextResponse.json({ payment_url });
}
      `.trimStart(),
    },
  ];

  for (const f of files) {
    await writeFileRecursive(f.path, f.content);
  }

  console.log("Part 3 complete ✅");
  console.log("Next steps:");
  console.log("  1) npx prisma format && npx prisma generate");
  console.log('  2) npx prisma migrate dev --name "part3_api_routes"');
  console.log("  3) pnpm dev");
  console.log("Sanity checks:");
  console.log("  - Create Deck (coach): opens modal, adds student if missing, emails credentials.");
  console.log("  - Tickets: student-only create card; coach/admin can update status; replies send email to student.");
  console.log("  - Documents: coach/admin add URL.");
  console.log("  - Profile: save name/phone (+ coach booking link).");
  console.log("  - Approvals: super admin approves/rejects coaches.");
  console.log("  - Payments (coach): toggles, banks, e-wallets, plans, invoices list.");
  console.log("  - Payments (student): create invoice from plan, view invoice, upload proof.");
  console.log("  - Checkout: /api/checkout -> Make webhook -> redirects user to payment_url on client.");
}

main().catch((e) => (console.error(e), process.exit(1)));
