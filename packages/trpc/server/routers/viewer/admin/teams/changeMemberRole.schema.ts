import { MembershipRole } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZAdminChangeMemberRoleInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  role: z.nativeEnum(MembershipRole),
});

export type TAdminChangeMemberRoleInputSchema = z.infer<typeof ZAdminChangeMemberRoleInputSchema>;
