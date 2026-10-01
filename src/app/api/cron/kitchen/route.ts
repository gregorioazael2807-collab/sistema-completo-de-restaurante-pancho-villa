import { runKitchenJobs } from "@/lib/kitchen-jobs";
import { operationError } from "@/lib/kitchen-transaction";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return Response.json({ error: "CRON_NOT_CONFIGURED" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    return Response.json(await runKitchenJobs());
  } catch (error) {
    return operationError(error);
  }
}
