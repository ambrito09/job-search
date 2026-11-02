import { z } from "zod";

export const roles = ["COMPANY", "CANDIDATE"] as const;
export const modes = ["ONSITE", "HYBRID", "REMOTE"] as const;
export const statuses = ["OPEN", "CLOSED"] as const;

const email = z.string().trim().toLowerCase().email("Correo inválido");
const password = z.string().min(8, "Mínimo 8 caracteres");
const text = (max: number) => z.string().trim().min(1, "Obligatorio").max(max, `Máximo ${max} caracteres`);

export const registerSchema = z.object({
  email,
  password,
  role: z.enum(roles),
  name: text(100),
});

export const loginSchema = z.object({ email, password: z.string().min(1, "Obligatoria") });

export const positionCreateSchema = z.object({
  title: text(120),
  description: text(5000),
  location: text(100),
  mode: z.enum(modes),
});

export const positionUpdateSchema = positionCreateSchema
  .extend({ status: z.enum(statuses) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Sin cambios");

export const applySchema = z.object({
  message: z.string().trim().max(2000).optional(),
});

export const positionFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  mode: z.enum(modes).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export type Role = (typeof roles)[number];
export type Mode = (typeof modes)[number];
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PositionCreateInput = z.infer<typeof positionCreateSchema>;
export type PositionUpdateInput = z.infer<typeof positionUpdateSchema>;
export type ApplyInput = z.infer<typeof applySchema>;
export type PositionFilters = z.infer<typeof positionFiltersSchema>;
