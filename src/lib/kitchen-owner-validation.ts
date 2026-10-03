import { z } from "zod";

// No se acepta un rol ni un restaurante existente desde el navegador.
export const kitchenOwnerRegistrationSchema = z.object({
  ownerName: z.string().trim().min(2).max(100),
  restaurantName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(12).max(128)
    .regex(/[A-Z]/, "Incluye una mayúscula")
    .regex(/[0-9]/, "Incluye un número"),
}).strict();
