import { promises as fs } from "fs";
import { join } from "path";
const base = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
await fs.mkdir(base, { recursive: true });
try {
  await fs.writeFile(join(base, ".can-write"), String(Date.now()));
  console.log("[ensure-uploads] OK:", base);
} catch (e) {
  console.error("[ensure-uploads] failed:", base, e);
  process.exit(1);
}
