import { z } from "zod";

export const ZAdminDeleteTeamInputSchema = z.object({
  teamId: z.number(),
});

export type TAdminDeleteTeamInputSchema = z.infer<typeof ZAdminDeleteTeamInputSchema>;
