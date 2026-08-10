import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import TeamsView from "~/settings/teams/teams-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("my_teams"),
    (t) => t("add_team_members_description"),
    undefined,
    undefined,
    "/settings/teams"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login?callbackUrl=/settings/teams");
  }

  return <TeamsView />;
};

export default Page;
