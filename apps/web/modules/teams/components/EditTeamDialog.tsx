"use client";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Form, TextField } from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { showToast } from "@calcom/ui/components/toast";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

type FormValues = { name: string; logoUrl: string | null };

type EditableTeam = { id: number; name: string; logoUrl: string | null };

const EditTeamDialog = ({
  team,
  open,
  onOpenChange,
}: {
  team: EditableTeam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const form = useForm<FormValues>({ defaultValues: { name: "", logoUrl: null } });

  // The dialog mounts once and gets reused for whichever row was clicked, so the form has to
  // be re-seeded from the current `team` prop each time a new one is opened.
  useEffect(() => {
    if (team) {
      form.reset({ name: team.name, logoUrl: team.logoUrl });
    }
  }, [team, form]);

  const updateMutation = trpc.viewer.teams.update.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.list.invalidate();
      showToast(t("team_updated_successfully"), "success");
      onOpenChange(false);
    },
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent type="creation">
        <DialogHeader title={t("edit_team")} />
        <Form
          form={form}
          handleSubmit={(values) => {
            if (!team) return;
            updateMutation.mutate({ id: team.id, name: values.name, logoUrl: values.logoUrl });
          }}>
          <Controller
            control={form.control}
            name="logoUrl"
            render={({ field: { value, onChange } }) => (
              <div className="mb-4 flex items-center">
                <Avatar
                  alt={form.watch("name") || ""}
                  imageSrc={getPlaceholderAvatar(value, form.watch("name"))}
                  size="lg"
                />
                <div className="ml-4">
                  <ImageUploader
                    target={t("team_logo")}
                    id="team-logo-upload-edit"
                    buttonMsg={t("upload_logo")}
                    handleAvatarChange={onChange}
                    imageSrc={getPlaceholderAvatar(value, form.watch("name"))}
                  />
                </div>
              </div>
            )}
          />
          <TextField label={t("team_name")} required {...form.register("name", { required: true })} />
          <DialogFooter showDivider>
            <Button type="button" color="secondary" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTeamDialog;
