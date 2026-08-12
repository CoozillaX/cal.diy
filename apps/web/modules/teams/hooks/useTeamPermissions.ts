import { meetsMinimumRole, type TeamPermissionKey } from "@calcom/features/teams/lib/teamPermissions";
import { trpc } from "@calcom/trpc/react";
import { useSession } from "next-auth/react";

/**
 * Whether the signed-in user meets a team's configured minimum role for a given catalog
 * permission - used to disable (not hide) booking/event-type action buttons the same way the
 * server would reject them. Fails open (returns true) while data is loading or when teamId is
 * absent (personal booking/event) or the caller isn't a team member (e.g. an org admin acting via
 * a path this hook doesn't know about) - this is only a UI hint, the server is still the real
 * enforcement point regardless of what this returns.
 */
export const useTeamPermissions = (teamId: number | null | undefined) => {
  const { data: sessionData } = useSession();
  const { data: members, isPending: isMembersPending } = trpc.viewer.teams.listMembers.useQuery(
    { teamId: teamId ?? 0 },
    { enabled: !!teamId }
  );
  const { data: settings, isPending: isSettingsPending } = trpc.viewer.teams.getPermissionSettings.useQuery(
    { teamId: teamId ?? 0 },
    { enabled: !!teamId }
  );

  const hasPermission = (permissionKey: TeamPermissionKey): boolean => {
    if (!teamId) return true;
    if (isMembersPending || isSettingsPending || !members || !settings) return true;

    const currentUserId = sessionData?.user?.id;
    const currentUserMembership = members.find((member) => member.user.id === currentUserId);
    if (!currentUserMembership) return true;

    const minimumRole = settings.find((setting) => setting.permissionKey === permissionKey)?.minimumRole;
    if (!minimumRole) return true;

    return meetsMinimumRole(currentUserMembership.role, minimumRole);
  };

  return { hasPermission };
};
