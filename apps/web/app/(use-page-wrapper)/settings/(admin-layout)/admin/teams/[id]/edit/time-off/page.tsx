import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { notFound } from "next/navigation";
import { requireAdminSession } from "~/teams/lib/requireAdminSession";
import TimeOffView, { TimeOffCTA } from "~/teams/views/time-off-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("time_off"),
    (t) => t("team_closures_description"),
    undefined,
    undefined,
    `/settings/admin/teams/${(await params).id}/edit/time-off`
  );

const Page = async ({ params: _params }: PageProps) => {
  await requireAdminSession();

  const params = await _params;
  const teamId = Number(params?.id);
  if (!Number.isInteger(teamId)) {
    notFound();
  }

  const t = await getTranslate();

  return (
    <SettingsHeader
      title={t("time_off")}
      description={t("team_closures_description")}
      CTA={<TimeOffCTA teamId={teamId} asAdmin />}>
      <TimeOffView teamId={teamId} asAdmin />
    </SettingsHeader>
  );
};

export default Page;
