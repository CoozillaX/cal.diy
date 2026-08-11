import slugify from "@calcom/lib/slugify";
import { z } from "zod";

export const ZCreateInputSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .transform((val) => slugify(val.trim())),
  logoUrl: z.string().nullable().optional(),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
