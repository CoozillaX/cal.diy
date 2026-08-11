import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import TeamsView, { TeamsCTA } from "~/settings/teams/teams-view";
import { ShellMainAppDir } from "../ShellMainAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("my_teams"),
    (t) => t("add_team_members_description"),
    undefined,
    undefined,
    "/teams"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login?callbackUrl=/teams");
  }

  const t = await getTranslate();

  return (
    <ShellMainAppDir heading={t("my_teams")} subtitle={t("add_team_members_description")} CTA={<TeamsCTA />}>
      <TeamsView />
    </ShellMainAppDir>
  );
};

export default Page;
