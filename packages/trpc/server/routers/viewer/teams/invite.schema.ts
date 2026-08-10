import { z } from "zod";

export const ZInviteInputSchema = z.object({
  teamId: z.number(),
  email: z.string().email(),
});

export type TInviteInputSchema = z.infer<typeof ZInviteInputSchema>;
