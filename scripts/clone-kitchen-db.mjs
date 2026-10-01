import fs from "node:fs";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
const source = dotenv.parse(fs.readFileSync("../Pancho Villa/.env"));
const target = dotenv.parse(fs.readFileSync(".env"));
const a = new URL(source.DATABASE_URL),
  b = new URL(target.DATABASE_URL);
if (b.pathname !== "/pancho_villa_cocina" || a.pathname === b.pathname)
  throw Error("Unsafe database target");
const clean = (u) => {
  u.search = "";
  return u.toString();
};
const maintenance = new URL(b);
maintenance.pathname = "/postgres";
function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) throw Error(cmd + " failed");
}
run("/usr/local/opt/postgresql@16/bin/psql", [
  clean(maintenance),
  "-v",
  "ON_ERROR_STOP=1",
  "-c",
  "CREATE DATABASE pancho_villa_cocina",
]);
const dump = "/tmp/pancho-cocina-private.dump";
try {
  run("/usr/local/opt/postgresql@16/bin/pg_dump", [
    "--format=custom",
    "--file=" + dump,
    clean(a),
  ]);
  fs.chmodSync(dump, 0o600);
  run("/usr/local/opt/postgresql@16/bin/pg_restore", [
    "--no-owner",
    "--no-privileges",
    "--dbname=" + clean(b),
    dump,
  ]);
} finally {
  if (fs.existsSync(dump)) fs.unlinkSync(dump);
}
console.log("Independent database copied. Original unchanged.");
