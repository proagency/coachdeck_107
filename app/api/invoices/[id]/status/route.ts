import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";

type Status = "PENDING"|"SUBMITTED"|"UNDER_REVIEW"|"PAID"|"REJECTED"|"CANCELED";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const inv = await prisma.invoice.findUnique({ where: { id }, include: { student: true } });
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN";
  if (!isAdmin && inv.coachId !== me.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const status = String(body?.status || "");
  const allowed: Status[] = ["PENDING","SUBMITTED","UNDER_REVIEW","PAID","REJECTED","CANCELED"];
  if (!allowed.includes(status as Status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const updated = await prisma.invoice.update({ where: { id }, data: { status: status as any } });

  // Notify student on status change
  const studentEmail = inv.student?.email || "";
  if (studentEmail) {
    try {
      await sendMail(
        studentEmail,
        "Invoice Status Updated",
        "Your invoice " + (inv.title || updated.id) + " is now: " + status + "."
      );
    } catch {}
  }

  return NextResponse.json({ invoice: updated });
}
