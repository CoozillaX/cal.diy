import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import { requireAdminSession } from "~/teams/lib/requireAdminSession";
import AdminTeamsAddView from "~/teams/views/admin-teams-add-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("add_new_team"),
    (t) => t("admin_teams_add_description"),
    undefined,
    undefined,
    "/settings/admin/teams/add"
  );

const Page = async () => {
  await requireAdminSession();
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("add_new_team")} description={t("admin_teams_add_description")}>
      <AdminTeamsAddView />
    </SettingsHeader>
  );
};

export default Page;
