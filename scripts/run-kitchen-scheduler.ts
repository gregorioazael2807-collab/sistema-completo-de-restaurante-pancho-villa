import "dotenv/config";
import { runKitchenJobs } from "../src/lib/kitchen-jobs";
import { db } from "../src/lib/db";
// This scheduler updates kitchen data only; email remains in the existing outbox worker.
if (
  new URL(process.env.DATABASE_URL!).pathname !== "/pancho_villa_cocina" &&
  process.env.ALLOW_KITCHEN_SCHEDULER !== "1"
)
  throw Error("Explicit opt-in required outside the isolated kitchen database");
let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const result = await runKitchenJobs();
    console.log(new Date().toISOString(), result);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Scheduler unavailable",
    );
  } finally {
    running = false;
  }
}
void tick();
const timer = setInterval(() => void tick(), 60000);
async function stop() {
  clearInterval(timer);
  await db.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
