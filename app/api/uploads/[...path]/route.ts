// app/api/uploads/[...path]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { promises as fs } from "fs";
import { join, normalize } from "path";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  svg: "image/svg+xml",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;

  // sanitize segments (prevent traversal)
  const safeSegs = (path || []).filter((s) => /^[\w.%-]+$/.test(s));
  const rel = safeSegs.join("/");

  const base = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
  const full = normalize(join(base, rel));
  const safeBase = normalize(base);

  if (!full.startsWith(safeBase)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    // Node returns a Buffer, which extends Uint8Array
    const file = await fs.readFile(full);
    const u8: Uint8Array = file; // TS-safe: Buffer is a Uint8Array

    const ext = (rel.split(".").pop() || "").toLowerCase();
    const type = MIME[ext] || "application/octet-stream";

    return new Response(u8, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
