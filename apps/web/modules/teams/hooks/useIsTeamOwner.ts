import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { useSession } from "next-auth/react";

/** Whether the signed-in user is the OWNER of the given team - stricter than useCanManageTeam
 * (admin+owner). Used to gate editing of the team permissions matrix, since an admin must not
 * be able to grant themselves more access than the owner configured.
 * `asAdmin` short-circuits to true for a platform admin managing the team from
 * /settings/admin/teams, who isn't a member of it at all - see agents/rules/architecture-page-level-auth.md. */
export const useIsTeamOwner = (teamId: number, asAdmin = false) => {
  const { data: sessionData } = useSession();
  const { data: members } = trpc.viewer.teams.listMembers.useQuery({ teamId }, { enabled: !asAdmin });
  if (asAdmin) return true;

  const currentUserId = sessionData?.user?.id;
  const currentUserMembership = members?.find((member) => member.user.id === currentUserId);
  return currentUserMembership?.role === MembershipRole.OWNER;
};
