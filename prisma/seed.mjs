import { PrismaClient, AccessLevel, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const hash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      accessLevel: AccessLevel.ADMIN,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: hash,
      name: "Super Admin"
    },
    create: {
      email,
      accessLevel: AccessLevel.ADMIN,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: hash,
      name: "Super Admin"
    }
  });

  console.log("Seeded Super Admin:", admin.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
      