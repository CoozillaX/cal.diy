import { z } from "zod";

export const ZAdminRemoveMemberInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
});

export type TAdminRemoveMemberInputSchema = z.infer<typeof ZAdminRemoveMemberInputSchema>;
