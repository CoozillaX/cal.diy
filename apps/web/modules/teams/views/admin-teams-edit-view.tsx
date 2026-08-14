"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import type { AdminTeamFormValues } from "../components/AdminTeamForm";
import { AdminTeamForm } from "../components/AdminTeamForm";

interface Team {
  id: number;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  bio: string | null;
}

export default function AdminTeamsEditView({ team }: { team: Team }) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

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

  return (
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
  );
}
