import { z } from "zod";

export const ZLeaveTeamInputSchema = z.object({
  teamId: z.number(),
});

export type TLeaveTeamInputSchema = z.infer<typeof ZLeaveTeamInputSchema>;
