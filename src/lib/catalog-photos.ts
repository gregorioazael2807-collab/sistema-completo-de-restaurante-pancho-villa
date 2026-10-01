import path from "node:path";
export const catalogPhotoDirectory = path.join(process.cwd(), ".data", "catalog-photos");
export const catalogPhotoFilename = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/;
