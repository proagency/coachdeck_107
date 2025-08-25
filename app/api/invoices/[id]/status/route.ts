import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  const isAdmin = ((session?.user as any)?.accessLevel === "ADMIN");
  if (!isAdmin && inv.coachId !== me.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const status = typeof body.status === "string" ? body.status : "";
  const allowed = ["PENDING", "SUBMITTED", "UNDER_REVIEW", "PAID", "REJECTED", "CANCELED"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: status as any },
  });

  return NextResponse.json({ invoice: updated });
}
