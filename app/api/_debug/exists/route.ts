import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get("url") || "";
  if (!u.startsWith("/uploads/")) {
    return NextResponse.json({ ok: false, reason: "url must start with /uploads/" }, { status: 400 });
  }
  const full = join(process.cwd(), "public", u.replace(/^\/+/, ""));
  const ok = existsSync(full);
  return NextResponse.json({ ok, url: u, full });
}
