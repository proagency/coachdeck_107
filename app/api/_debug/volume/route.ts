import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";

export async function GET() {
  const dir = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
  try {
    await fs.mkdir(dir, { recursive: true });
    const test = join(dir, ".debug-" + Date.now());
    await fs.writeFile(test, "ok");
    return NextResponse.json({ ok: true, dir, wrote: test });
  } catch (e:any) {
    return NextResponse.json({ ok: false, dir, error: e?.message || String(e) }, { status: 500 });
  }
}
