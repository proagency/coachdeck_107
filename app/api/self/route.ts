import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, phone: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ name: me.name || "", email: me.email, phone: me.phone || "", role: me.role });
}
