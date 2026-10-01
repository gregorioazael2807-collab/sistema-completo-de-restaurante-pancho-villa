import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { requireRole } from "@/lib/access";
import { catalogPhotoDirectory } from "@/lib/catalog-photos";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const access = await requireRole(["ADMIN"]);
  if ("response" in access) return access.response;
  if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024) return Response.json({ error: "PHOTO_TOO_LARGE" }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) return Response.json({ error: "PHOTO_TOO_LARGE" }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const image = sharp(bytes, { limitInputPixels: 25_000_000, animated: false });
    const meta = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format ?? "") || (meta.pages ?? 1) > 1) return Response.json({ error: "INVALID_PHOTO" }, { status: 400 });
    const output = await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    const filename = `${randomUUID()}.webp`;
    await mkdir(catalogPhotoDirectory, { recursive: true });
    await writeFile(path.join(catalogPhotoDirectory, filename), output, { flag: "wx" });
    return Response.json({ src: `/api/catalog/photos/${filename}` }, { status: 201 });
  } catch { return Response.json({ error: "PHOTO_UPLOAD_FAILED" }, { status: 400 }); }
}
