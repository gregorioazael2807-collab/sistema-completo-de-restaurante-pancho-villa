import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  password: z
    .string()
    .min(12, "La contraseña debe tener al menos 12 caracteres.")
    .max(128)
    .regex(/[a-z]/, "Incluye una letra minúscula.")
    .regex(/[A-Z]/, "Incluye una letra mayúscula.")
    .regex(/[0-9]/, "Incluye un número."),
  locale: z.enum(["es", "en", "de"]).default("es"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
