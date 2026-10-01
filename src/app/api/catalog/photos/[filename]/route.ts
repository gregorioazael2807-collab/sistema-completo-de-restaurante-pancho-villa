import { readFile } from "node:fs/promises";
import path from "node:path";
import { catalogPhotoDirectory, catalogPhotoFilename } from "@/lib/catalog-photos";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!catalogPhotoFilename.test(filename)) return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(path.join(catalogPhotoDirectory, filename));
    return new Response(bytes, { headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
  } catch { return new Response(null, { status: 404 }); }
}
