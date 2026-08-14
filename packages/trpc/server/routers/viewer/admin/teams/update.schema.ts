import slugify from "@calcom/lib/slugify";
import { z } from "zod";

export const ZAdminUpdateTeamInputSchema = z.object({
  teamId: z.number(),
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .transform((val) => slugify(val.trim()))
    .optional(),
  bio: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
});

export type TAdminUpdateTeamInputSchema = z.infer<typeof ZAdminUpdateTeamInputSchema>;
