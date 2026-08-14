"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Form, Label, Select, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { CSSObjectWithLabel } from "react-select";
import type { UserOption } from "./AdminUserPicker";
import { AdminUserPicker } from "./AdminUserPicker";

type InviteFormValues = { email: string };
type RoleOption = { value: MembershipRole; label: string };

/** The email-invite form used by real team owners/admins. Unchanged from before asAdmin existed. */
const InviteByEmailForm = ({
  teamId,
  onOpenChange,
}: {
  teamId: number;
  onOpenChange: (open: boolean) => void;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const form = useForm<InviteFormValues>({ defaultValues: { email: "" } });

  const inviteMutation = trpc.viewer.teams.invite.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.listMembers.invalidate({ teamId });
      showToast(t("invite_sent"), "success");
      form.reset();
      onOpenChange(false);
    },
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  return (
    <Form
      form={form}
      handleSubmit={(values) => {
        inviteMutation.mutate({ teamId, email: values.email });
      }}>
      <TextField
        label={t("email_address")}
        type="email"
        required
        {...form.register("email", { required: true })}
      />
      <DialogFooter showDivider>
        <Button type="button" color="secondary" onClick={() => onOpenChange(false)}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={inviteMutation.isPending}>
          {t("send_invite")}
        </Button>
      </DialogFooter>
    </Form>
  );
};

/** Platform-admin variant - adds an existing user directly (membership created already accepted),
 * no invite email, per agents/rules/architecture-page-level-auth.md. */
const AddExistingMemberForm = ({
  teamId,
  onOpenChange,
}: {
  teamId: number;
  onOpenChange: (open: boolean) => void;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [user, setUser] = useState<UserOption | null>(null);
  const [role, setRole] = useState<MembershipRole>(MembershipRole.MEMBER);

  const roleOptions: RoleOption[] = [
    { value: MembershipRole.MEMBER, label: t("member") },
    { value: MembershipRole.ADMIN, label: t("admin") },
    { value: MembershipRole.OWNER, label: t("owner") },
  ];

  const addMutation = trpc.viewer.admin.teams.addMember.useMutation({
    onSuccess: async () => {
      await utils.viewer.admin.teams.listMembers.invalidate({ teamId });
      showToast(t("member_added_successfully"), "success");
      setUser(null);
      onOpenChange(false);
    },
    onError: (err) => showToast(err.message || t("error_adding_member"), "error"),
  });

  return (
    <div className="stack-y-4">
      <div>
        <Label className="font-medium text-default">{t("team_members")}</Label>
        <AdminUserPicker value={user} onChange={setUser} />
      </div>
      <div>
        <Label className="font-medium text-default">{t("role")}</Label>
        <Select<RoleOption>
          value={roleOptions.find((option) => option.value === role)}
          options={roleOptions}
          onChange={(option) => option && setRole(option.value)}
          menuPortalTarget={typeof document !== "undefined" ? document.body : null}
          menuPlacement="auto"
          styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) as CSSObjectWithLabel }}
        />
      </div>
      <DialogFooter showDivider>
        <Button type="button" color="secondary" onClick={() => onOpenChange(false)}>
          {t("cancel")}
        </Button>
        <Button
          type="button"
          disabled={!user}
          loading={addMutation.isPending}
          onClick={() => user && addMutation.mutate({ teamId, userId: user.value, role })}>
          {t("add_member")}
        </Button>
      </DialogFooter>
    </div>
  );
};

const InviteMemberDialog = ({
  teamId,
  open,
  onOpenChange,
  asAdmin = false,
}: {
  teamId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asAdmin?: boolean;
}) => {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent type="creation">
        <DialogHeader title={t(asAdmin ? "add_member" : "invite_team_member")} />
        {asAdmin ? (
          <AddExistingMemberForm teamId={teamId} onOpenChange={onOpenChange} />
        ) : (
          <InviteByEmailForm teamId={teamId} onOpenChange={onOpenChange} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;
