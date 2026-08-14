import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { notFound } from "next/navigation";
import { requireAdminSession } from "~/teams/lib/requireAdminSession";
import PermissionsView from "~/teams/views/permissions-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) => {
  await requireAdminSession();
  return await _generateMetadata(
    (t) => t("permissions"),
    (t) => t("team_permissions_description"),
    undefined,
    undefined,
    `/settings/admin/teams/${(await params).id}/edit/permissions`
  );
};

const Page = async ({ params: _params }: PageProps) => {
  await requireAdminSession();

  const params = await _params;
  const teamId = Number(params?.id);
  if (!Number.isInteger(teamId)) {
    notFound();
  }

  const t = await getTranslate();

  return (
    <SettingsHeader title={t("permissions")} description={t("team_permissions_description")}>
      <PermissionsView teamId={teamId} asAdmin />
    </SettingsHeader>
  );
};

export default Page;
