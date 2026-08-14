import { z } from "zod";

export const ZAdminListMembersInputSchema = z.object({
  teamId: z.number(),
});

export type TAdminListMembersInputSchema = z.infer<typeof ZAdminListMembersInputSchema>;
