import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Button } from "@calcom/ui/components/button";
import { _generateMetadata, getTranslate } from "app/_utils";
import { requireAdminSession } from "~/teams/lib/requireAdminSession";
import AdminTeamsListingView from "~/teams/views/admin-teams-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("admin_teams_description"),
    undefined,
    undefined,
    "/settings/admin/teams"
  );

const Page = async () => {
  await requireAdminSession();
  const t = await getTranslate();
  return (
    <SettingsHeader
      title={t("teams")}
      description={t("admin_teams_description")}
      CTA={
        <div className="mt-4 space-x-5 sm:mt-0 sm:ml-16 sm:flex-none">
          <Button href="/settings/admin/teams/add">{t("add_new_team")}</Button>
        </div>
      }>
      <AdminTeamsListingView />
    </SettingsHeader>
  );
};

export default Page;
