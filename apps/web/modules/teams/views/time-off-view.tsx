"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { useState } from "react";
import CreateTeamOOOModal from "~/teams/components/CreateTeamOOOModal";
import TeamHolidaysSection from "~/teams/components/TeamHolidaysSection";
import TeamOOOEntriesList from "~/teams/components/TeamOOOEntriesList";
import TeamSettingsLayout from "~/teams/components/TeamSettingsLayout";
import { useCanManageTeam } from "~/teams/hooks/useCanManageTeam";

/** Content only - the page (rendered inside the main app shell) owns the heading and renders
 * TimeOffCTA separately as the shell's CTA slot, matching MembersView's split.
 * `asAdmin`: platform admin managing any team from /settings/admin/teams, not a member of it -
 * see agents/rules/architecture-page-level-auth.md. */
const TimeOffView = ({ teamId, asAdmin = false }: { teamId: number; asAdmin?: boolean }) => {
  const { t } = useLocale();
  const canManage = useCanManageTeam(teamId, asAdmin);

  return (
    <TeamSettingsLayout teamId={teamId} asAdmin={asAdmin}>
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 font-semibold text-emphasis">{t("team_closures")}</h3>
          <p className="mb-4 text-sm text-subtle">{t("team_closures_description")}</p>
          <TeamOOOEntriesList teamId={teamId} canManage={canManage} asAdmin={asAdmin} />
        </div>

        <TeamHolidaysSection teamId={teamId} canManage={canManage} asAdmin={asAdmin} />
      </div>
    </TeamSettingsLayout>
  );
};

export const TimeOffCTA = ({ teamId, asAdmin = false }: { teamId: number; asAdmin?: boolean }) => {
  const { t } = useLocale();
  const canManage = useCanManageTeam(teamId, asAdmin);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  if (!canManage) return null;

  return (
    <>
      <Button color="primary" StartIcon="plus" onClick={() => setCreateModalOpen(true)}>
        {t("add")}
      </Button>
      <CreateTeamOOOModal
        teamId={teamId}
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        asAdmin={asAdmin}
      />
    </>
  );
};

export default TimeOffView;
