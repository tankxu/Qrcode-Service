import { z } from "zod";

export const targetImageSchema = z.object({
  type: z.literal("image"),
  payload: z.object({
    r2_key: z.string().min(1).max(256),
    mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  }),
});

const urlString = z
  .string()
  .url()
  .max(2048)
  .refine((u) => /^https?:\/\//i.test(u), "Must start with http:// or https://")
  .refine((u) => {
    try {
      const host = new URL(u).hostname.toLowerCase();
      if (host === "localhost" || host.endsWith(".localhost")) return false;
      if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return false;
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
      return true;
    } catch {
      return false;
    }
  }, "URL host not allowed");

export const targetUrlSchema = z.object({
  type: z.literal("url"),
  payload: z.object({
    url: urlString,
  }),
});

export const targetMultilinkSchema = z.object({
  type: z.literal("multilink"),
  payload: z.object({
    title: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
    items: z
      .array(
        z.object({
          label: z.string().min(1).max(80),
          url: urlString,
        }),
      )
      .min(1)
      .max(10),
  }),
});

export const targetSchema = z.discriminatedUnion("type", [
  targetImageSchema,
  targetUrlSchema,
  targetMultilinkSchema,
]);

export type TargetInput = z.infer<typeof targetSchema>;

export const createQrInputSchema = z.object({
  title: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  note: z.string().max(1000).optional(),
  target: targetSchema,
});

export const updateQrInputSchema = z.object({
  title: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  note: z.string().max(1000).nullable().optional(),
  status: z.enum(["active", "paused"]).optional(),
  target: targetSchema.optional(),
});

export const uploadInitInputSchema = z.object({
  mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
  size: z.number().int().positive().max(2 * 1024 * 1024), // 2MB cap
});
