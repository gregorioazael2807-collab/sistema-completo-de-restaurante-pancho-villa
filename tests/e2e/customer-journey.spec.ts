import { test,expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { randomUUID,createHash } from "node:crypto";
test.use({baseURL:"http://localhost:3004"});
test("visitantes no acceden a conversaciones ni avisos",async({request})=>{expect((await request.get("/api/ai/journey")).status()).toBe(401);expect((await request.patch("/api/ai/journey",{data:{ids:["notice"]}})).status()).toBe(401);});
test("conversación persistente, avisos entre pantallas y aislamiento de cuentas",async({page,context})=>{
 test.skip(process.env.RUN_JOURNEY_WRITE_TESTS!=="1","Opt-in: creates only temporary users and an order fixture without email jobs.");test.setTimeout(90000);
 const db=new PrismaClient();const suffix=randomUUID();const users:string[]=[];let orderId="";
 async function login(userId:string){const salt="authjs.session-token";const token=await encode({token:{sub:userId,role:"CLIENTE",sessionVersion:0},secret:process.env.AUTH_SECRET!,salt});await context.clearCookies();await context.addCookies([{name:salt,value:token,domain:"localhost",path:"/",httpOnly:true,sameSite:"Lax"}]);}
 try {
  const a=await db.user.create({data:{email:`journey-a-${suffix}@example.test`,role:"CLIENTE",firstName:"Cliente A",locale:"es"}});users.push(a.id);const b=await db.user.create({data:{email:`journey-b-${suffix}@example.test`,role:"CLIENTE",firstName:"Cliente B",locale:"es"}});users.push(b.id);
  const publicId=`MX-${suffix.replaceAll("-","").slice(0,20).toUpperCase()}`;
  const order=await db.order.create({data:{publicId,userId:a.id,type:"PICKUP",status:"NUEVO",customerName:"Prueba",customerEmail:a.email,customerPhone:"12345678",subtotal:12,total:12,taxAmount:0,deliveryFee:0,customerNotices:{create:{userId:a.id,eventKey:`test:${suffix}:new`,status:"NUEVO"}},statusHistory:{create:{to:"NUEVO"}}}});orderId=order.id;
  await login(a.id);await page.goto("/menu");await expect(page.getByRole("button",{name:"Abrir SaborMX",exact:true})).toBeVisible();await expect(page.locator(".journey-toast")).toContainText(publicId);await page.getByRole("button",{name:"Abrir SaborMX",exact:true}).click();
  const requestId=randomUUID();const first=await context.request.post("/api/ai/chat",{data:{message:"¿Cuál es el estado de mi pedido?",requestId}});expect(first.status()).toBe(200);const duplicate=await context.request.post("/api/ai/chat",{data:{message:"¿Cuál es el estado de mi pedido?",requestId}});expect(duplicate.status()).toBe(200);expect(await db.assistantMessage.count({where:{userId:a.id}})).toBe(2);
  await page.getByLabel("Pregunta por tu pedido o el menú",{exact:true}).fill("¿Qué estado tiene mi pedido ahora?");await page.locator(".journey-panel").getByRole("button",{name:"Enviar",exact:true}).click();await expect(page.locator(".journey-message.user")).toContainText(["¿Cuál es el estado de mi pedido?","¿Qué estado tiene mi pedido ahora?"]);
  await page.reload();await page.getByRole("button",{name:"Abrir SaborMX",exact:true}).click();await expect(page.locator(".journey-message.assistant").last()).toContainText(publicId);
  await page.goto("/carrito");await expect(page.locator(".journey-toast")).toContainText(publicId);
  await db.$transaction([db.order.update({where:{id:order.id},data:{status:"EN_PREPARACION"}}),db.customerNotice.create({data:{userId:a.id,orderId:order.id,eventKey:`test:${suffix}:preparing`,status:"EN_PREPARACION"}}),db.orderStatusHistory.create({data:{orderId:order.id,from:"NUEVO",to:"EN_PREPARACION"}})]);
  await expect(page.locator(".journey-toast")).toContainText("en preparación",{timeout:15000});await page.getByRole("button",{name:"Abrir SaborMX",exact:true}).click();
  const unread=await db.customerNotice.findMany({where:{userId:a.id,readAt:null}});for(const notice of unread){const result=await context.request.patch("/api/ai/journey",{data:{ids:[notice.id]}});expect(result.status()).toBe(200);}
  await page.reload();await expect(page.getByRole("button",{name:"Abrir SaborMX",exact:true})).toBeVisible();await expect(page.locator(".journey-toast")).toHaveCount(0);
  await page.goto("/asistente");await expect(page.locator(".assistant-messages")).toContainText("¿Cuál es el estado de mi pedido?");await expect(page.locator(".assistant-order-list")).toContainText("En preparación");
  await login(b.id);await page.goto("/menu");await page.getByRole("button",{name:"Abrir SaborMX",exact:true}).click();await expect(page.locator(".journey-panel")).not.toContainText(publicId);const foreign=await context.request.post("/api/ai/chat",{data:{message:"estado pedido",selectedOrderId:publicId}});expect(foreign.status()).toBe(404);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:"/tmp/pancho-journey-mobile.png",fullPage:true});
 } finally {if(orderId)await db.order.delete({where:{id:orderId}});await db.aIAuditEvent.deleteMany({where:{userId:{in:users}}});for(const id of users){const bucket=Math.floor(Date.now()/(15*60000));await db.authRateLimit.deleteMany({where:{key:{in:[bucket,bucket-1].map(time=>createHash("sha256").update(`assistant:${id}:${time}`).digest("hex"))}}});await db.user.delete({where:{id}});}await db.$disconnect();}
});
