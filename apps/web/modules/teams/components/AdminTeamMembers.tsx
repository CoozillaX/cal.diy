"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { Select } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";
import type { CSSObjectWithLabel } from "react-select";
import type { UserOption } from "./AdminUserPicker";
import { AdminUserPicker } from "./AdminUserPicker";

type RoleOption = { value: MembershipRole; label: string };

export const AdminTeamMembers = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [newMember, setNewMember] = useState<UserOption | null>(null);
  const [newMemberRole, setNewMemberRole] = useState<MembershipRole>(MembershipRole.MEMBER);
  const [memberToRemove, setMemberToRemove] = useState<number | null>(null);

  const { data: team, isPending } = trpc.viewer.admin.teams.get.useQuery({ teamId });

  const roleOptions: RoleOption[] = [
    { value: MembershipRole.MEMBER, label: t("member") },
    { value: MembershipRole.ADMIN, label: t("admin") },
    { value: MembershipRole.OWNER, label: t("owner") },
  ];

  const addMemberMutation = trpc.viewer.admin.teams.addMember.useMutation({
    onSuccess: () => {
      showToast(t("member_added_successfully"), "success");
      setNewMember(null);
      utils.viewer.admin.teams.get.invalidate({ teamId });
      utils.viewer.admin.teams.list.invalidate();
    },
    onError: (err) => showToast(err.message || t("error_adding_member"), "error"),
  });

  const removeMemberMutation = trpc.viewer.admin.teams.removeMember.useMutation({
    onSuccess: () => {
      utils.viewer.admin.teams.get.invalidate({ teamId });
      utils.viewer.admin.teams.list.invalidate();
    },
    onError: (err) => showToast(err.message || t("error_removing_member"), "error"),
    onSettled: () => setMemberToRemove(null),
  });

  if (isPending || !team) return null;

  return (
    <div className="stack-y-4">
      <div className="overflow-hidden rounded-md border border-subtle">
        {team.members.map((membership) => (
          <div
            key={membership.user.id}
            className="flex items-center justify-between border-subtle border-b px-4 py-3 last:border-b-0">
            <div className="flex items-center gap-3">
              <Avatar
                size="sm"
                alt={membership.user.name ?? membership.user.email}
                imageSrc={membership.user.avatarUrl}
              />
              <div>
                <p className="font-medium text-emphasis">{membership.user.name}</p>
                <p className="text-sm text-subtle">{membership.user.email}</p>
              </div>
              <Badge variant={membership.role === MembershipRole.OWNER ? "orange" : "gray"}>
                {membership.role.toLowerCase()}
              </Badge>
              {!membership.accepted && <Badge variant="gray">{t("pending")}</Badge>}
            </div>
            <Button
              type="button"
              color="minimal"
              variant="icon"
              StartIcon="trash"
              disabled={removeMemberMutation.isPending}
              onClick={() => setMemberToRemove(membership.user.id)}
            />
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <AdminUserPicker value={newMember} onChange={setNewMember} />
        </div>
        <div className="w-36">
          <Select<RoleOption>
            value={roleOptions.find((option) => option.value === newMemberRole)}
            options={roleOptions}
            onChange={(option) => option && setNewMemberRole(option.value)}
            menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            menuPlacement="auto"
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) as CSSObjectWithLabel }}
          />
        </div>
        <Button
          type="button"
          disabled={!newMember}
          loading={addMemberMutation.isPending}
          onClick={() => {
            if (!newMember) return;
            addMemberMutation.mutate({ teamId, userId: newMember.value, role: newMemberRole });
          }}>
          {t("add_member")}
        </Button>
      </div>

      <Dialog open={!!memberToRemove} onOpenChange={(open) => (open ? undefined : setMemberToRemove(null))}>
        <ConfirmationDialogContent
          title={t("remove_member")}
          confirmBtnText={t("remove")}
          cancelBtnText={t("cancel")}
          variety="danger"
          onConfirm={() => {
            if (!memberToRemove) return;
            removeMemberMutation.mutate({ teamId, userId: memberToRemove });
          }}>
          <p>{t("remove_member_confirmation")}</p>
        </ConfirmationDialogContent>
      </Dialog>
    </div>
  );
};
