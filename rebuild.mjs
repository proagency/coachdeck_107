import fs from "fs";
import path from "path";

const root = process.cwd();
const file = path.join(root, "app/(dashboard)/decks/[id]/page.tsx");

if (!fs.existsSync(file)) {
  console.error("❌ deck page not found:", file);
  process.exit(1);
}

let src = fs.readFileSync(file, "utf8");
let changed = false;

const hasIsCoach = /\bconst\s+isCoach\b/.test(src);
const hasIsAdmin = /\bconst\s+isAdmin\b/.test(src);

// Insert after the first `if (!deck) return notFound();`
const anchor = "if (!deck) return notFound();";
const idx = src.indexOf(anchor);

if (idx !== -1) {
  const insertPos = idx + anchor.length;
  const toInsert = [
    !hasIsCoach ? `\n\n  const isCoach = deck.coachId === me.id;` : "",
    !hasIsAdmin ? `\n  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN";` : "",
    "\n",
  ].join("");

  if (toInsert.trim()) {
    src = src.slice(0, insertPos) + toInsert + src.slice(insertPos);
    changed = true;
  }
} else {
  // Fallback: insert after the `deck` fetch if anchor not found
  const deckDeclMatch = src.match(/const\s+deck\s*=\s*await\s+prisma\.deck[\s\S]*?;\s*/);
  if (deckDeclMatch && (!hasIsCoach || !hasIsAdmin)) {
    const pos = deckDeclMatch.index + deckDeclMatch[0].length;
    const toInsert = [
      !hasIsCoach ? `\n  const isCoach = deck.coachId === me.id;` : "",
      !hasIsAdmin ? `\n  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN";` : "",
      "\n",
    ].join("");
    src = src.slice(0, pos) + toInsert + src.slice(pos);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(file, src, "utf8");
  console.log("✅ Patched:", file);
} else {
  console.log("ℹ️ No changes needed (isCoach/isAdmin already present).");
}
