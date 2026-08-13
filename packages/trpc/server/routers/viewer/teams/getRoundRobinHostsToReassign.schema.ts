import { z } from "zod";

export const ZGetRoundRobinHostsToReassignInputSchema = z.object({
  bookingId: z.number(),
  cursor: z.number().nullish(),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type TGetRoundRobinHostsToReassignInputSchema = z.infer<
  typeof ZGetRoundRobinHostsToReassignInputSchema
>;
