"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { useSession } from "next-auth/react";
import { useState } from "react";
import InviteMemberDialog from "~/teams/components/InviteMemberDialog";
import MemberListItem from "~/teams/components/MemberListItem";
import TeamSettingsLayout from "~/teams/components/TeamSettingsLayout";
import { useCanManageTeam } from "~/teams/hooks/useCanManageTeam";

const ADMIN_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

/** Content only - the page (rendered inside the main app shell, not the settings shell)
 * owns the heading and renders MembersCTA separately as the shell's CTA slot.
 * `asAdmin`: platform admin managing any team from /settings/admin/teams - see
 * agents/rules/architecture-page-level-auth.md. Sources the roster from the unrestricted
 * admin.teams endpoint instead of the membership-gated one, and can always manage. */
const MembersView = ({ teamId, asAdmin = false }: { teamId: number; asAdmin?: boolean }) => {
  const { t } = useLocale();
  const { data: sessionData } = useSession();

  const memberQuery = trpc.viewer.teams.listMembers.useQuery({ teamId }, { enabled: !asAdmin });
  const adminMemberQuery = trpc.viewer.admin.teams.listMembers.useQuery({ teamId }, { enabled: asAdmin });
  const members = asAdmin ? adminMemberQuery.data : memberQuery.data;
  const isPending = asAdmin ? adminMemberQuery.isPending : memberQuery.isPending;

  const currentUserId = sessionData?.user?.id;
  const currentUserMembership = members?.find((member) => member.user.id === currentUserId);
  const canManage = asAdmin || (!!currentUserMembership && ADMIN_ROLES.includes(currentUserMembership.role));

  return (
    <TeamSettingsLayout teamId={teamId} asAdmin={asAdmin}>
      {isPending && (
        <SkeletonContainer>
          <SkeletonText className="mb-4 h-8 w-full" />
          <SkeletonText className="h-8 w-full" />
        </SkeletonContainer>
      )}

      {!isPending && members && members.length === 0 && (
        <EmptyScreen
          Icon="users"
          headline={t("no_members_found")}
          description={t("add_team_members_description")}
        />
      )}

      {!isPending && members && members.length > 0 && (
        <div className="rounded-lg border border-subtle">
          {members.map((member, index) => (
            <MemberListItem
              key={member.user.id}
              teamId={teamId}
              member={member}
              canManage={canManage}
              isSelf={member.user.id === currentUserId}
              lastItem={index === members.length - 1}
              asAdmin={asAdmin}
            />
          ))}
        </div>
      )}
    </TeamSettingsLayout>
  );
};

export const MembersCTA = ({ teamId, asAdmin = false }: { teamId: number; asAdmin?: boolean }) => {
  const { t } = useLocale();
  const canManage = useCanManageTeam(teamId, asAdmin);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  if (!canManage) return null;

  return (
    <>
      <Button color="primary" StartIcon="plus" onClick={() => setInviteDialogOpen(true)}>
        {t(asAdmin ? "add_member" : "invite")}
      </Button>
      <InviteMemberDialog
        teamId={teamId}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        asAdmin={asAdmin}
      />
    </>
  );
};

export default MembersView;
