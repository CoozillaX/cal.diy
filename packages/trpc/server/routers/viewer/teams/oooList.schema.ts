import { z } from "zod";

export const ZOOOListInputSchema = z.object({
  teamId: z.number(),
});

export type TOOOListInputSchema = z.infer<typeof ZOOOListInputSchema>;
