import { z } from "zod";

export const ZAdminRemoveMemberInputSchema = z.object({
  teamId: z.number(),
  userId: z.number(),
});

export type TAdminRemoveMemberInputSchema = z.infer<typeof ZAdminRemoveMemberInputSchema>;
