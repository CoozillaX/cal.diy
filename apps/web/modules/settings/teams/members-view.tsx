"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
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
import InviteMemberDialog from "~/settings/teams/components/InviteMemberDialog";
import MemberListItem from "~/settings/teams/components/MemberListItem";

const ADMIN_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

const MembersView = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const router = useRouter();
  const { data: sessionData } = useSession();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const { data: team } = trpc.viewer.teams.get.useQuery({ teamId });
  const { data: members, isPending } = trpc.viewer.teams.listMembers.useQuery({ teamId });

  const currentUserId = sessionData?.user?.id;
  const currentUserMembership = members?.find((member) => member.user.id === currentUserId);
  const canManage = !!currentUserMembership && ADMIN_ROLES.includes(currentUserMembership.role);
  const isOwner = currentUserMembership?.role === MembershipRole.OWNER;

  const goToTeamsList = () => router.push("/settings/teams");

  const deleteMutation = trpc.viewer.teams.delete.useMutation({
    onSuccess: goToTeamsList,
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  const leaveMutation = trpc.viewer.teams.leaveTeam.useMutation({
    onSuccess: goToTeamsList,
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  return (
    <SettingsHeader
      title={team?.name ?? t("members")}
      description={t("add_team_members_description")}
      borderInShellHeader={false}
      CTA={
        canManage && (
          <Button color="primary" StartIcon="plus" onClick={() => setInviteDialogOpen(true)}>
            {t("invite")}
          </Button>
        )
      }>
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

      <InviteMemberDialog teamId={teamId} open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />

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
    </SettingsHeader>
  );
};

export default MembersView;
