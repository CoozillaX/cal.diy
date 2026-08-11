"use client";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { Form, Label, TextField } from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import TeamSettingsLayout from "~/teams/components/TeamSettingsLayout";

type FormValues = { name: string; logoUrl: string | null };

/** Content only - the page (rendered inside the main app shell) owns the heading. Only
 * reachable by team owners/admins - TeamSettingsLayout hides this tab for everyone else. */
const ProfileView = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: sessionData } = useSession();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const form = useForm<FormValues>({ defaultValues: { name: "", logoUrl: null } });

  const { data: team, isPending } = trpc.viewer.teams.get.useQuery({ teamId });
  const { data: members } = trpc.viewer.teams.listMembers.useQuery({ teamId });

  const currentUserId = sessionData?.user?.id;
  const currentUserMembership = members?.find((member) => member.user.id === currentUserId);
  const isOwner = currentUserMembership?.role === MembershipRole.OWNER;

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
    <TeamSettingsLayout teamId={teamId}>
      {isPending ? (
        <SkeletonContainer>
          <SkeletonText className="h-8 w-full" />
        </SkeletonContainer>
      ) : (
        <Form form={form} handleSubmit={(values) => updateMutation.mutate({ id: teamId, ...values })}>
          <div className="rounded-t-lg border border-subtle px-4 pt-8 pb-10 sm:px-6">
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
                  <div className="ms-4">
                    <h2 className="mb-2 font-medium text-sm">{t("team_logo")}</h2>
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
            <div className="mt-6">
              <TextField label={t("team_name")} required {...form.register("name", { required: true })} />
            </div>
          </div>
          <SectionBottomActions align="end">
            <Button type="submit" loading={updateMutation.isPending}>
              {t("save")}
            </Button>
          </SectionBottomActions>
        </Form>
      )}

      {currentUserMembership && (
        <>
          <div className="mt-6 rounded-lg rounded-b-none border border-subtle border-b-0 p-6">
            <Label className="mb-0 font-semibold text-base text-red-700">{t("danger_zone")}</Label>
            <p className="text-sm text-subtle">
              {isOwner ? t("team_deletion_cannot_be_undone") : t("leave_team_confirmation_message")}
            </p>
          </div>
          <SectionBottomActions align="end">
            <Button type="button" color="destructive" onClick={() => setLeaveDialogOpen(true)}>
              {isOwner ? t("disband_team") : t("leave_team")}
            </Button>
          </SectionBottomActions>
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
              <p className="text-sm text-subtle">
                {isOwner ? t("disband_team_confirmation_message") : t("leave_team_confirmation_message")}
              </p>
            </ConfirmationDialogContent>
          </Dialog>
        </>
      )}
    </TeamSettingsLayout>
  );
};

export default ProfileView;
