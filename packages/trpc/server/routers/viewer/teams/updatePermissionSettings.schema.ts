import { TEAM_PERMISSIONS, type TeamPermissionKey } from "@calcom/features/teams/lib/teamPermissions";
import { MembershipRole } from "@calcom/prisma/enums";
import { z } from "zod";

const permissionKeyValues = Object.values(TEAM_PERMISSIONS) as [TeamPermissionKey, ...TeamPermissionKey[]];

export const ZUpdatePermissionSettingsInputSchema = z.object({
  teamId: z.number(),
  settings: z
    .array(
      z.object({
        permissionKey: z.enum(permissionKeyValues),
        minimumRole: z.nativeEnum(MembershipRole),
      })
    )
    .min(1),
});

export type TUpdatePermissionSettingsInputSchema = z.infer<typeof ZUpdatePermissionSettingsInputSchema>;
