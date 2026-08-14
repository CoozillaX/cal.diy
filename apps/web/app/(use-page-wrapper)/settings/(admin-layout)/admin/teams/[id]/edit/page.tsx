import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { Params } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { z } from "zod";
import { requireAdminSession } from "~/teams/lib/requireAdminSession";
import AdminTeamsEditView from "~/teams/views/admin-teams-edit-view";

const teamIdSchema = z.object({ id: z.coerce.number() });

export const generateMetadata = async ({ params }: { params: Params }) => {
  const input = teamIdSchema.safeParse(await params);
  if (!input.success) {
    return await _generateMetadata(
      (t) => t("editing_team"),
      (t) => t("admin_teams_edit_description"),
      undefined,
      undefined,
      "/settings/admin/teams/edit"
    );
  }

  const teamService = getTeamService();
  const team = await teamService.adminGetTeam({ teamId: input.data.id });

  return await _generateMetadata(
    (t) => `${t("editing_team")}: ${team.name}`,
    (t) => t("admin_teams_edit_description"),
    undefined,
    undefined,
    `/settings/admin/teams/${input.data.id}/edit`
  );
};

const Page = async ({ params }: { params: Params }) => {
  await requireAdminSession();
  const input = teamIdSchema.safeParse(await params);
  if (!input.success) throw new Error("Invalid access");

  const teamService = getTeamService();
  const team = await teamService.adminGetTeam({ teamId: input.data.id });

  const t = await getTranslate();

  return (
    <SettingsHeader title={t("editing_team")} description={t("admin_teams_edit_description")}>
      <AdminTeamsEditView team={team} />
    </SettingsHeader>
  );
};

export default Page;
