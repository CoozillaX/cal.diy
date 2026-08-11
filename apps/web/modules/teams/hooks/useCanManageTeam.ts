import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { useSession } from "next-auth/react";

const ADMIN_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

/** Whether the signed-in user is an owner/admin of the given team - the same bar used for
 * inviting/removing members, so team-wide OOO/holiday settings reuse it too. */
export const useCanManageTeam = (teamId: number) => {
  const { data: sessionData } = useSession();
  const { data: members } = trpc.viewer.teams.listMembers.useQuery({ teamId });
  const currentUserId = sessionData?.user?.id;
  const currentUserMembership = members?.find((member) => member.user.id === currentUserId);
  return !!currentUserMembership && ADMIN_ROLES.includes(currentUserMembership.role);
};
