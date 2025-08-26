import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { promises as fs } from "fs";
import { join } from "path";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Only student, coach, or admin
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { student: true, coach: true } });
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const me = await prisma.user.findFirst({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isOwnerStudent = inv.studentId === me.id;
  const isCoach = inv.coachId === me.id;
  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN";
  if (!isOwnerStudent && !isCoach && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const safe = (file.name || "proof").toLowerCase().replace(/[^a-z0-9\.\-_]+/g, "_").slice(0, 120);
  const filename = `${id}-${Date.now()}-${safe || "proof"}`;

  const pub = join(process.cwd(), "public");
  const dir = join(pub, "uploads");
  await fs.mkdir(dir, { recursive: true });
  const full = join(dir, filename);
  await fs.writeFile(full, buffer);

  // Debug logging (server console)
  console.log("[upload] wrote file:", full);

  const proofUrl = "/uploads/" + filename;
  const updated = await prisma.invoice.update({
    where: { id },
    data: { proofUrl, status: inv.status === "PENDING" ? "SUBMITTED" : inv.status },
  });

  return NextResponse.json({ ok: true, proofUrl: updated.proofUrl });
}
