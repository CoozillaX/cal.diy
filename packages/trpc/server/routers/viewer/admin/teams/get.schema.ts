import { z } from "zod";

export const ZAdminGetTeamInputSchema = z.object({
  teamId: z.number(),
});

export type TAdminGetTeamInputSchema = z.infer<typeof ZAdminGetTeamInputSchema>;
