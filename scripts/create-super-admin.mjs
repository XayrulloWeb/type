import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const username = String(process.env.NEW_ADMIN_USERNAME ?? "").trim().toLowerCase();
const password = String(process.env.NEW_ADMIN_PASSWORD ?? "");
const firstName = String(process.env.NEW_ADMIN_FIRST_NAME ?? "Administrator").trim();
const lastName = String(process.env.NEW_ADMIN_LAST_NAME ?? "NOVA").trim();

async function main() {
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) throw new Error("NEW_ADMIN_USERNAME is invalid.");
  if (password.length < 8) throw new Error("NEW_ADMIN_PASSWORD must contain at least 8 characters.");
  if (!firstName || !lastName) throw new Error("Administrator name is required.");

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true, role: true } });
  if (existing && existing.role !== "SUPER_ADMIN") {
    throw new Error(`The username ${username} already belongs to a non-administrator account.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const account = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          passwordHash,
          passwordEncrypted: null,
          classId: null,
          isActive: true,
          archivedAt: null,
          mustChangePassword: false,
        },
        select: { id: true, username: true, role: true, isActive: true },
      })
    : await prisma.user.create({
        data: {
          firstName,
          lastName,
          username,
          passwordHash,
          role: "SUPER_ADMIN",
          isActive: true,
          mustChangePassword: false,
        },
        select: { id: true, username: true, role: true, isActive: true },
      });

  console.log(JSON.stringify({ action: existing ? "updated" : "created", ...account }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
