import { z } from "zod";
import { requireRole } from "@/lib/access";
import { getJourney } from "@/lib/customer-journey";
import { db } from "@/lib/db";
export async function GET() {
 const access=await requireRole(["CLIENTE","ADMIN"]);
 if("response"in access)return access.response;
 try {
  const customer=await db.user.findUniqueOrThrow({where:{id:access.actor.id},select:{id:true,firstName:true,locale:true}});
  return Response.json({customer,...await getJourney(customer.id)},{headers:{"cache-control":"no-store"}});
 } catch {return Response.json({error:"JOURNEY_UNAVAILABLE"},{status:503});}
}
const receipt=z.object({ids:z.array(z.string().min(1).max(100)).min(1).max(50)});
export async function PATCH(request:Request) {
 const access=await requireRole(["CLIENTE","ADMIN"]);
 if("response"in access)return access.response;
 const parsed=receipt.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return Response.json({error:"INVALID_NOTICE"},{status:400});
 try {
  await db.customerNotice.updateMany({where:{userId:access.actor.id,id:{in:parsed.data.ids},readAt:null},data:{readAt:new Date()}});
  return Response.json({read:true});
 } catch {return Response.json({error:"NOTICE_UNAVAILABLE"},{status:503});}
}
