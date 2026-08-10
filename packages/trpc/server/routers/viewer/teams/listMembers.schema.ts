import { z } from "zod";

export const ZListMembersInputSchema = z.object({
  teamId: z.number(),
});

export type TListMembersInputSchema = z.infer<typeof ZListMembersInputSchema>;
