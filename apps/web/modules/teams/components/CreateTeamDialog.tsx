import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Form, TextField } from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

type FormValues = { name: string; logoUrl: string | null };

const CreateTeamDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const form = useForm<FormValues>({ defaultValues: { name: "", logoUrl: null } });

  const createMutation = trpc.viewer.teams.create.useMutation({
    onSuccess: async (team) => {
      await utils.viewer.teams.listPaginated.invalidate();
      form.reset();
      onOpenChange(false);
      router.push(`/teams/${team.id}/members`);
    },
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent type="creation">
        <DialogHeader title={t("create_team")} />
        <Form
          form={form}
          handleSubmit={(values) => {
            createMutation.mutate({
              name: values.name,
              slug: slugify(values.name),
              logoUrl: values.logoUrl,
            });
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
                    id="team-logo-upload"
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
            <Button type="submit" loading={createMutation.isPending}>
              {t("create_team")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamDialog;
