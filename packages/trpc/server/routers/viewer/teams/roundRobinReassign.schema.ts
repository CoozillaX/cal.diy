import { z } from "zod";

export const ZRoundRobinReassignInputSchema = z.object({
  bookingId: z.number(),
  reassignReason: z.string().optional(),
});

export type TRoundRobinReassignInputSchema = z.infer<typeof ZRoundRobinReassignInputSchema>;
