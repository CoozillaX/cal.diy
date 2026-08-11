"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import InviteMemberDialog from "~/teams/components/InviteMemberDialog";
import MemberListItem from "~/teams/components/MemberListItem";

const ADMIN_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

const useCanManage = (teamId: number) => {
  const { data: sessionData } = useSession();
  const { data: members } = trpc.viewer.teams.listMembers.useQuery({ teamId });
  const currentUserId = sessionData?.user?.id;
  const currentUserMembership = members?.find((member) => member.user.id === currentUserId);
  return !!currentUserMembership && ADMIN_ROLES.includes(currentUserMembership.role);
};

/** Content only - the page (rendered inside the main app shell, not the settings shell)
 * owns the heading and renders MembersCTA separately as the shell's CTA slot. */
const MembersView = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const { data: members, isPending } = trpc.viewer.teams.listMembers.useQuery({ teamId });

  const currentUserId = sessionData?.user?.id;
  const currentUserMembership = members?.find((member) => member.user.id === currentUserId);
  const canManage = !!currentUserMembership && ADMIN_ROLES.includes(currentUserMembership.role);
  const isOwner = currentUserMembership?.role === MembershipRole.OWNER;

  const goToTeamsList = () => router.push("/teams");

  const deleteMutation = trpc.viewer.teams.delete.useMutation({
    onSuccess: goToTeamsList,
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  const leaveMutation = trpc.viewer.teams.leaveTeam.useMutation({
    onSuccess: goToTeamsList,
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  return (
    <>
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
        <div className="border-subtle rounded-lg border">
          {members.map((member, index) => (
            <MemberListItem
              key={member.user.id}
              teamId={teamId}
              member={member}
              canManage={canManage}
              isSelf={member.user.id === currentUserId}
              lastItem={index === members.length - 1}
            />
          ))}
        </div>
      )}

      {currentUserMembership && (
        <div className="border-subtle mt-6 flex items-center justify-between rounded-lg border border-dashed p-4">
          <p className="text-subtle text-sm">
            {isOwner ? t("team_deletion_cannot_be_undone") : t("leave_team_confirmation_message")}
          </p>
          <Button type="button" color="destructive" onClick={() => setLeaveDialogOpen(true)}>
            {isOwner ? t("disband_team") : t("leave_team")}
          </Button>
        </div>
      )}

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title={isOwner ? t("disband_team") : t("leave_team")}
          confirmBtnText={isOwner ? t("disband_team") : t("confirm_leave_team")}
          isPending={isOwner ? deleteMutation.isPending : leaveMutation.isPending}
          onConfirm={() => {
            if (isOwner) {
              deleteMutation.mutate({ teamId });
            } else {
              leaveMutation.mutate({ teamId });
            }
            setLeaveDialogOpen(false);
          }}>
          <p className="text-subtle text-sm">
            {isOwner ? t("disband_team_confirmation_message") : t("leave_team_confirmation_message")}
          </p>
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
};

export const MembersCTA = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const canManage = useCanManage(teamId);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  if (!canManage) return null;

  return (
    <>
      <Button color="primary" StartIcon="plus" onClick={() => setInviteDialogOpen(true)}>
        {t("invite")}
      </Button>
      <InviteMemberDialog teamId={teamId} open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />
    </>
  );
};

export default MembersView;
