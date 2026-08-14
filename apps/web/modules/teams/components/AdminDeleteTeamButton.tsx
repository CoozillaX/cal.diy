"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Rendered as the SettingsHeader CTA on both admin/teams/[id] tabs, so it's always visible
 * regardless of which tab (edit/members) is active, rather than living inside either tab. */
export const AdminDeleteTeamButton = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [isOpen, setIsOpen] = useState(false);

  const deleteMutation = trpc.viewer.admin.teams.delete.useMutation({
    onSuccess: () => {
      showToast(t("team_has_been_deleted"), "success");
      utils.viewer.admin.teams.list.invalidate();
      router.replace("/settings/admin/teams");
    },
    onError: (err) => showToast(err.message || t("error_deleting_team"), "error"),
    onSettled: () => setIsOpen(false),
  });

  return (
    <>
      <Button color="destructive" onClick={() => setIsOpen(true)}>
        {t("delete_team")}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <ConfirmationDialogContent
          title={t("delete_team")}
          confirmBtnText={t("delete")}
          cancelBtnText={t("cancel")}
          variety="danger"
          onConfirm={() => deleteMutation.mutate({ teamId })}>
          <p>{t("delete_team_confirmation")}</p>
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
};
