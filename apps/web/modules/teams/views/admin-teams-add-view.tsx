"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import type { AdminTeamFormValues } from "../components/AdminTeamForm";
import { AdminTeamForm } from "../components/AdminTeamForm";

export default function AdminTeamsAddView() {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  const mutation = trpc.viewer.admin.teams.create.useMutation({
    onSuccess: async (team) => {
      showToast(t("team_added_successfully"), "success");
      await utils.viewer.admin.teams.list.invalidate();
      router.replace(`/settings/admin/teams/${team.id}/edit`);
    },
    onError: (err) => {
      console.error(err.message);
      showToast(err.message || t("error_adding_team"), "error");
    },
  });

  return (
    <AdminTeamForm
      submitLabel="add"
      requireOwner
      isSubmitting={mutation.isPending}
      onSubmit={(values: AdminTeamFormValues) => {
        if (!values.owner) return;
        mutation.mutate({
          name: values.name,
          slug: values.slug,
          logoUrl: values.logoUrl,
          ownerUserId: values.owner.value,
        });
      }}
    />
  );
}
