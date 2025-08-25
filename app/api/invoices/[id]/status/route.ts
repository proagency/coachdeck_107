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
      