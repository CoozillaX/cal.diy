import slugify from "@calcom/lib/slugify";
import { z } from "zod";

export const ZUpdateInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .transform((val) => slugify(val.trim()))
    .optional(),
  bio: z.string().optional(),
  theme: z.string().nullable().optional(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
