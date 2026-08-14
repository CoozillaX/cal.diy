import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import type { Params } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { AdminDeleteTeamButton } from "~/teams/components/AdminDeleteTeamButton";
import { AdminTeamTabs } from "~/teams/components/AdminTeamTabs";
import { getAdminTeamOrThrow } from "~/teams/lib/getAdminTeamOrThrow";
import { requireAdminSession } from "~/teams/lib/requireAdminSession";
import AdminTeamsMembersView from "~/teams/views/admin-teams-members-view";

export const generateMetadata = async ({ params }: { params: Params }) => {
  const team = await getAdminTeamOrThrow(await params).catch(() => null);

  return await _generateMetadata(
    (t) => (team ? `${t("team_members")}: ${team.name}` : t("team_members")),
    (t) => t("admin_teams_edit_description"),
    undefined,
    undefined,
    team ? `/settings/admin/teams/${team.id}/members` : "/settings/admin/teams/members"
  );
};

const Page = async ({ params }: { params: Params }) => {
  await requireAdminSession();
  const team = await getAdminTeamOrThrow(await params);
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={team.name}
      description={t("admin_teams_edit_description")}
      CTA={<AdminDeleteTeamButton teamId={team.id} />}>
      <AdminTeamTabs teamId={team.id} />
      <AdminTeamsMembersView teamId={team.id} />
    </SettingsHeader>
  );
};

export default Page;
