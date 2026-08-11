"use client";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import TeamSubNav from "~/teams/components/TeamSubNav";

type FormValues = { name: string; logoUrl: string | null };

/** Content only - the page (rendered inside the main app shell) owns the heading. Only
 * reachable by team owners/admins - TeamSubNav hides this tab for everyone else. */
const ProfileView = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const form = useForm<FormValues>({ defaultValues: { name: "", logoUrl: null } });

  const { data: team, isPending } = trpc.viewer.teams.get.useQuery({ teamId });

  useEffect(() => {
    if (team) {
      form.reset({ name: team.name, logoUrl: team.logoUrl });
    }
  }, [team, form]);

  const updateMutation = trpc.viewer.teams.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.viewer.teams.get.invalidate({ teamId }),
        utils.viewer.teams.listPaginated.invalidate(),
      ]);
      showToast(t("team_updated_successfully"), "success");
    },
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  return (
    <>
      <TeamSubNav teamId={teamId} />

      {isPending ? (
        <SkeletonContainer>
          <SkeletonText className="h-8 w-full" />
        </SkeletonContainer>
      ) : (
        <Form
          form={form}
          handleSubmit={(values) => updateMutation.mutate({ id: teamId, ...values })}
          className="divide-y divide-subtle rounded-lg border border-subtle">
          <div className="p-6">
            <Controller
              control={form.control}
              name="logoUrl"
              render={({ field: { value, onChange } }) => (
                <div className="flex items-center">
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
            <TextField
              className="mt-6"
              label={t("team_name")}
              required
              {...form.register("name", { required: true })}
            />
          </div>
          <div className="flex justify-end p-6">
            <Button type="submit" loading={updateMutation.isPending}>
              {t("save")}
            </Button>
          </div>
        </Form>
      )}
    </>
  );
};

export default ProfileView;
