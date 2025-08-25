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
      