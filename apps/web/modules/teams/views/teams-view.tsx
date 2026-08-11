"use client";

import NoSSR from "@calcom/lib/components/NoSSR";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";
import CreateTeamDialog from "~/teams/components/CreateTeamDialog";
import { TeamsTable } from "~/teams/components/TeamsTable";

/** Content only - the page (rendered inside the main app shell, not the settings shell)
 * owns the heading and renders TeamsCTA separately as the shell's CTA slot. */
const TeamsView = () => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: pendingInvites, isPending: invitesPending } =
    trpc.viewer.teams.listMyPendingInvites.useQuery();

  const acceptInviteMutation = trpc.viewer.teams.acceptInvite.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.viewer.teams.listPaginated.invalidate(),
        utils.viewer.teams.listMyPendingInvites.invalidate(),
      ]);
      showToast(t("success"), "success");
    },
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  return (
    <>
      {!invitesPending && pendingInvites && pendingInvites.length > 0 && (
        <div className="mb-6">
          <h3 className="text-emphasis mb-2 text-sm font-semibold">{t("pending_invites")}</h3>
          <div className="border-subtle rounded-lg border">
            {pendingInvites.map((invite, index) => (
              <div
                key={invite.team.id}
                className={`flex items-center justify-between px-4 py-4 sm:px-6 ${
                  index === pendingInvites.length - 1 ? "" : "border-subtle border-b"
                }`}>
                <div>
                  <p className="text-emphasis text-sm font-semibold">{invite.team.name}</p>
                  <Badge variant="orange">{t("pending")}</Badge>
                </div>
                <Button
                  color="primary"
                  size="sm"
                  loading={acceptInviteMutation.isPending}
                  onClick={() => acceptInviteMutation.mutate({ teamId: invite.team.id })}>
                  {t("accept")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <NoSSR>
        <TeamsTable />
      </NoSSR>
    </>
  );
};

export const TeamsCTA = () => {
  const { t } = useLocale();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <>
      <Button color="primary" StartIcon="plus" onClick={() => setCreateDialogOpen(true)}>
        {t("create_team")}
      </Button>
      <CreateTeamDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
};

export default TeamsView;
