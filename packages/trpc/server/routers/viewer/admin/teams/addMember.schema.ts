import { MembershipRole } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZAdminAddMemberInputSchema = z.object({
  teamId: z.number(),
  userId: z.number(),
  role: z.nativeEnum(MembershipRole).default(MembershipRole.MEMBER),
});

export type TAdminAddMemberInputSchema = z.infer<typeof ZAdminAddMemberInputSchema>;
