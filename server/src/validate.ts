import type { RequestHandler } from "express";
import type { ZodType } from "zod";

// Valida req.body con un esquema Zod compartido; deja el resultado ya parseado en req.body.
export const validate = (schema: ZodType): RequestHandler => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    res.status(400).json({ error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
    return;
  }
  req.body = result.data;
  next();
};
