import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Form, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useForm } from "react-hook-form";

type FormValues = { email: string };

const InviteMemberDialog = ({
  teamId,
  open,
  onOpenChange,
}: {
  teamId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const form = useForm<FormValues>({ defaultValues: { email: "" } });

  const inviteMutation = trpc.viewer.teams.invite.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.listMembers.invalidate({ teamId });
      showToast(t("invite_sent"), "success");
      form.reset();
      onOpenChange(false);
    },
    onError: (err) => {
      showToast(err.message || t("something_went_wrong"), "error");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent type="creation">
        <DialogHeader title={t("invite_team_member")} />
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
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;
