import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const firstName = process.env.ADMIN_FIRST_NAME?.trim();
  const lastName = process.env.ADMIN_LAST_NAME?.trim();

  if (!email || !password || !firstName || !lastName) {
    throw new Error(
      "Set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, and ADMIN_LAST_NAME.",
    );
  }
  if (
    password.length < 12 ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 12 characters with an uppercase letter and a number.",
    );
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });
  if (existing) {
    if (existing.role !== "ADMIN")
      throw new Error(
        "That email belongs to a non-admin user; refusing to change its role.",
      );
    console.log("Admin account already exists; no changes made.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      role: "ADMIN",
      locale: "es",
    },
  });
  console.log("Admin account created.");
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Admin bootstrap failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
