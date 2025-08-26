import { promises as fs } from "fs";
import { join } from "path";

const base = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");

async function main(){
  await fs.mkdir(base, { recursive: true });
  // touch a canary (won't overwrite if exists)
  const canary = join(base, ".can-write");
  try {
    await fs.writeFile(canary, String(Date.now()), { flag: "w" });
    console.log("[ensure-uploads] OK:", base);
  } catch (e) {
    console.error("[ensure-uploads] Failed to write to:", base, e);
    process.exit(1);
  }
}
main();
