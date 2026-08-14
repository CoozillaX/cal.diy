import slugify from "@calcom/lib/slugify";
import { z } from "zod";

export const ZAdminCreateTeamInputSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .transform((val) => slugify(val.trim())),
  logoUrl: z.string().nullable().optional(),
  ownerUserId: z.number(),
});

export type TAdminCreateTeamInputSchema = z.infer<typeof ZAdminCreateTeamInputSchema>;
