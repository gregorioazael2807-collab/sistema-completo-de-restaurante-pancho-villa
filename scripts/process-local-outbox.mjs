import { readFile } from "node:fs/promises";
import { parse } from "dotenv";

// Read on each run so rotated credentials do not require reinstalling the task.
const env = parse(await readFile(new URL("../.env", import.meta.url), "utf8"));
const stamp = () => new Date().toISOString();

if (!env.CRON_SECRET || !env.RESEND_API_KEY || !env.EMAIL_FROM) {
  console.error(`${stamp()} Email configuration is incomplete.`);
  process.exitCode = 1;
} else {
  try {
    // Keep credentials on this computer, regardless of the public site URL.
    const response = await fetch("http://127.0.0.1:3004/api/cron/outbox", {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      redirect: "error",
      signal: AbortSignal.timeout(55_000),
    });
    if (!response.ok) {
      console.error(`${stamp()} Outbox returned HTTP ${response.status}.`);
      process.exitCode = 1;
    } else {
      const { sent, failed, skipped } = await response.json();
      console.log(`${stamp()} sent=${sent} failed=${failed} skipped=${skipped}`);
      if (failed > 0) process.exitCode = 1;
    }
  } catch {
    console.error(`${stamp()} Local outbox unavailable; retry on next scheduled run.`);
    process.exitCode = 1;
  }
}
