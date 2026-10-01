import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";

const db = new PrismaClient();

try {
  const photos: { src: string }[] = JSON.parse(
    await readFile(new URL("../src/lib/menu-photo-credits.json", import.meta.url), "utf8"),
  );
  await db.$transaction(async (tx) => {
    for (const { src } of photos) {
      const slug = src.slice("/menu/".length, -".jpg".length);
      const product = await tx.product.findUniqueOrThrow({
        where: { slug },
        select: { id: true },
      });
      await tx.productImage.update({
        where: { productId: product.id },
        data: { src },
      });
    }
  });
  console.log(`Updated ${photos.length} product photo paths.`);
} finally {
  await db.$disconnect();
}
