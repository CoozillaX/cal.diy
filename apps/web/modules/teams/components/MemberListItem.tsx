import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

type Member = RouterOutputs["viewer"]["teams"]["listMembers"][number];

const ROLE_BADGE_VARIANT: Record<MembershipRole, "default" | "gray" | "orange"> = {
  [MembershipRole.OWNER]: "orange",
  [MembershipRole.ADMIN]: "default",
  [MembershipRole.MEMBER]: "gray",
};

const MemberListItem = ({
  teamId,
  member,
  canManage,
  isSelf,
  lastItem,
}: {
  teamId: number;
  member: Member;
  canManage: boolean;
  isSelf: boolean;
  lastItem: boolean;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const invalidateMembers = () => utils.viewer.teams.listMembers.invalidate({ teamId });

  const changeRoleMutation = trpc.viewer.teams.changeMemberRole.useMutation({
    onSuccess: async () => {
      await invalidateMembers();
      showToast(t("role_updated_successfully"), "success");
    },
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  const removeMutation = trpc.viewer.teams.removeMember.useMutation({
    onSuccess: async () => {
      await invalidateMembers();
      showToast(t("member_removed"), "success");
    },
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  const canModifyThisMember = canManage && !isSelf;

  return (
    <div
      className={`flex w-full items-center justify-between px-4 py-4 sm:px-6 ${
        lastItem ? "" : "border-subtle border-b"
      }`}>
      <div className="flex items-center gap-3">
        <Avatar
          size="sm"
          imageSrc={member.user.avatarUrl}
          alt={member.user.name ?? member.user.email}
          accepted={member.accepted}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emphasis text-sm">
              {member.user.name ?? member.user.username ?? member.user.email}
            </span>
            {isSelf && <Badge variant="gray">{t("you")}</Badge>}
            {!member.accepted && <Badge variant="orange">{t("pending")}</Badge>}
          </div>
          <span className="text-sm text-subtle">{member.user.email}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={ROLE_BADGE_VARIANT[member.role]}>{t(member.role.toLowerCase())}</Badge>

        {canModifyThisMember && (
          <Dropdown>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{t("role")}</DropdownMenuLabel>
              {Object.values(MembershipRole).map((role) => (
                <DropdownMenuItem key={role}>
                  <DropdownItem
                    type="button"
                    disabled={role === member.role || changeRoleMutation.isPending}
                    onClick={() => changeRoleMutation.mutate({ teamId, memberId: member.user.id, role })}>
                    {t(role.toLowerCase())}
                  </DropdownItem>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <DropdownItem
                  type="button"
                  color="destructive"
                  StartIcon="user-x"
                  onClick={() => setRemoveDialogOpen(true)}>
                  {t("remove")}
                </DropdownItem>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </Dropdown>
        )}
      </div>

      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("remove")}
          confirmBtnText={t("remove")}
          isPending={removeMutation.isPending}
          onConfirm={() => {
            removeMutation.mutate({ teamId, memberId: member.user.id });
            setRemoveDialogOpen(false);
          }}>
          <p className="text-sm text-subtle">{member.user.email}</p>
        </ConfirmationDialogContent>
      </Dialog>
    </div>
  );
};

export default MemberListItem;
