import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
test.use({ baseURL: "http://localhost:3004" });

test("el catálogo administrativo rechaza visitantes",async({request})=>{
 for(const method of ["GET","POST","DELETE"]){const response=await request.fetch("/api/admin/catalog",{method,data:method==="GET"?undefined:{kind:"product"}});expect(response.status()).toBe(401);}
 expect((await request.post("/api/admin/catalog/photos")).status()).toBe(401);
});

test("administrador mantiene categorías, extras, platos y fotografías",async({page,context})=>{
 test.skip(process.env.RUN_CATALOG_WRITE_TESTS!=="1","Requires explicit opt-in: only creates and removes its own catalog fixtures; no orders or email.");
 test.setTimeout(90000);
 const db=new PrismaClient();const suffix=randomUUID();let userId="";let categoryId="";let groupId="";let productId="";let photo="";
 try {
  const user=await db.user.create({data:{email:`catalog-${suffix}@example.test`,role:"ADMIN",firstName:"Catálogo",locale:"es"}});userId=user.id;
  const salt="authjs.session-token";const jwt=await encode({token:{sub:user.id,role:"ADMIN",sessionVersion:0},secret:process.env.AUTH_SECRET!,salt});
  await context.addCookies([{name:salt,value:jwt,domain:"localhost",path:"/",httpOnly:true,sameSite:"Lax"}]);
  await page.goto("/admin/productos");await expect(page.getByRole("heading",{name:"Catálogo",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Crear · Platos",exact:true})).toBeVisible();
  const form=page.locator(".catalog-admin-form");
  await page.getByRole("button",{name:"Categorías",exact:true}).click();await page.getByRole("button",{name:"Crear · Categorías",exact:true}).click();
  await form.getByLabel("Nombre base",{exact:true}).fill(`Categoría ${suffix}`);await form.getByLabel("Identificador URL").fill(`categoria-${suffix}`);await form.getByRole("button",{name:"Guardar",exact:true}).click();await expect(form).toHaveCount(0);
  categoryId=(await db.category.findUniqueOrThrow({where:{slug:`categoria-${suffix}`}})).id;
  await page.getByRole("button",{name:"Grupos de extras",exact:true}).click();await page.getByRole("button",{name:"Crear · Grupos de extras",exact:true}).click();await form.getByLabel("Nombre base",{exact:true}).fill(`Grupo ${suffix}`);await form.getByRole("button",{name:"Guardar",exact:true}).click();await expect(form).toHaveCount(0);groupId=(await db.modifierGroup.findFirstOrThrow({where:{name:`Grupo ${suffix}`}})).id;
  await page.getByRole("button",{name:"Extras",exact:true}).click();await page.getByRole("button",{name:"Crear · Extras",exact:true}).click();await form.getByLabel("Nombre base",{exact:true}).fill(`Extra ${suffix}`);await form.getByRole("combobox",{name:"Grupo",exact:true}).selectOption(groupId);await form.getByLabel("Precio adicional (€)").fill("1.25");await form.getByRole("button",{name:"Guardar",exact:true}).click();await expect(form).toHaveCount(0);
  await page.getByRole("button",{name:"Platos",exact:true}).click();await page.getByRole("button",{name:"Crear · Platos",exact:true}).click();await form.getByLabel("Nombre base",{exact:true}).fill(`Plato ${suffix}`);await form.getByLabel("Identificador URL").fill(`plato-${suffix}`);await form.getByLabel("Descripción",{exact:true}).first().fill("Plato temporal de prueba");await form.getByRole("combobox",{name:"Categoría",exact:true}).selectOption(categoryId);await form.getByLabel("Precio (€)",{exact:true}).fill("12.50");await form.getByLabel(`Grupo ${suffix}`,{exact:true}).check();
  await form.getByLabel(/Subir JPG/).setInputFiles("public/menu/tacos-al-pastor.jpg");await expect(page.getByRole("status")).toContainText("Foto subida");await form.getByLabel("Descripción de la foto").fill("Foto temporal de prueba");await form.getByRole("button",{name:"Guardar",exact:true}).click();await expect(form).toHaveCount(0);
  const product=await db.product.findUniqueOrThrow({where:{slug:`plato-${suffix}`},include:{image:true}});productId=product.id;photo=product.image!.src;
  expect((await context.request.get(photo)).status()).toBe(200);
  let catalog=await (await context.request.get("/api/catalog?locale=es")).json();const dish=catalog.categories.flatMap((entry:{products:{slug:string,image:{src:string},modifierGroups:{modifiers:{priceDelta:number}[]}[]}[]})=>entry.products).find((entry:{slug:string})=>entry.slug===product.slug);expect(dish.image.src).toBe(photo);expect(dish.modifierGroups[0].modifiers[0].priceDelta).toBe(1.25);
  const row=page.locator(".catalog-admin-row").filter({hasText:product.slug});await row.getByRole("button",{name:"Editar",exact:true}).click();await form.getByLabel("Precio (€)",{exact:true}).fill("13.25");await form.getByRole("combobox",{name:"Seleccionar fotografía existente",exact:true}).selectOption("");await form.getByRole("button",{name:"Guardar",exact:true}).click();await expect(form).toHaveCount(0);expect((await db.product.findUniqueOrThrow({where:{id:productId},include:{image:true}})).image).toBeNull();
  page.once("dialog",dialog=>dialog.accept());await row.getByRole("button",{name:"Retirar del menú",exact:true}).click();await expect(row).toContainText("Retirado");
  catalog=await (await context.request.get("/api/catalog?locale=es")).json();expect(catalog.categories.flatMap((entry:{products:{slug:string}[]})=>entry.products).some((entry:{slug:string})=>entry.slug===product.slug)).toBe(false);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:"/tmp/pancho-catalog-admin-mobile.png",fullPage:true});
 }finally{
  // Only these test-owned entities are removed; no orders are created.
  if(productId)await db.product.delete({where:{id:productId}});
  else await db.product.deleteMany({where:{slug:`plato-${suffix}`}});
  if(groupId)await db.modifierGroup.delete({where:{id:groupId}});
  else await db.modifierGroup.deleteMany({where:{name:`Grupo ${suffix}`}});
  if(categoryId)await db.category.delete({where:{id:categoryId}});
  else await db.category.deleteMany({where:{slug:`categoria-${suffix}`}});
  if(userId)await db.user.delete({where:{id:userId}});
  if(photo)await unlink(path.join(process.cwd(),".data/catalog-photos",photo.split("/").pop()!));
  await db.$disconnect();
 }
});
