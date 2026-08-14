import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { notFound } from "next/navigation";
import { requireAdminSession } from "~/teams/lib/requireAdminSession";
import MembersView, { MembersCTA } from "~/teams/views/members-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("members"),
    (t) => t("add_team_members_description"),
    undefined,
    undefined,
    `/settings/admin/teams/${(await params).id}/edit/members`
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
      title={t("members")}
      description={t("add_team_members_description")}
      CTA={<MembersCTA teamId={teamId} asAdmin />}>
      <MembersView teamId={teamId} asAdmin />
    </SettingsHeader>
  );
};

export default Page;
