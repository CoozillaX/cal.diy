"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminTeamFormValues } from "../components/AdminTeamForm";
import { AdminTeamForm } from "../components/AdminTeamForm";
import { AdminTeamMembers } from "../components/AdminTeamMembers";

interface Team {
  id: number;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  bio: string | null;
}

export default function AdminTeamsEditView({ team }: { team: Team }) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const updateMutation = trpc.viewer.admin.teams.update.useMutation({
    onSuccess: async () => {
      showToast(t("team_updated_successfully"), "success");
      await Promise.all([
        utils.viewer.admin.teams.list.invalidate(),
        utils.viewer.admin.teams.get.invalidate(),
      ]);
    },
    onError: (err) => showToast(err.message || t("error_updating_team"), "error"),
  });

  const deleteMutation = trpc.viewer.admin.teams.delete.useMutation({
    onSuccess: () => {
      showToast(t("team_has_been_deleted"), "success");
      utils.viewer.admin.teams.list.invalidate();
      router.replace("/settings/admin/teams");
    },
    onError: (err) => showToast(err.message || t("error_deleting_team"), "error"),
    onSettled: () => setIsDeleteOpen(false),
  });

  return (
    <div className="stack-y-6">
      <AdminTeamForm
        key={team.id}
        defaultValues={{
          name: team.name,
          slug: team.slug ?? "",
          logoUrl: team.logoUrl,
          bio: team.bio ?? "",
        }}
        isSubmitting={updateMutation.isPending}
        onSubmit={(values: AdminTeamFormValues) => {
          updateMutation.mutate({
            teamId: team.id,
            name: values.name,
            slug: values.slug,
            logoUrl: values.logoUrl,
            bio: values.bio,
          });
        }}
      />

      <div>
        <h3 className="mb-2 font-semibold text-emphasis">{t("team_members")}</h3>
        <AdminTeamMembers teamId={team.id} />
      </div>

      <div className="border-subtle border-t pt-6">
        <Button color="destructive" onClick={() => setIsDeleteOpen(true)}>
          {t("delete_team")}
        </Button>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <ConfirmationDialogContent
          title={t("delete_team")}
          confirmBtnText={t("delete")}
          cancelBtnText={t("cancel")}
          variety="danger"
          onConfirm={() => deleteMutation.mutate({ teamId: team.id })}>
          <p>{t("delete_team_confirmation")}</p>
        </ConfirmationDialogContent>
      </Dialog>
    </div>
  );
}
