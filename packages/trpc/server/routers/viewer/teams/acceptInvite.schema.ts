import { z } from "zod";

export const ZAcceptInviteInputSchema = z.object({
  teamId: z.number(),
});

export type TAcceptInviteInputSchema = z.infer<typeof ZAcceptInviteInputSchema>;
