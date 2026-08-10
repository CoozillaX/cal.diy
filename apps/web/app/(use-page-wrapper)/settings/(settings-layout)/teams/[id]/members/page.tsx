import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import MembersView from "~/settings/teams/members-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("members"),
    (t) => t("add_team_members_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/members`
  );

const Page = async ({ params: _params }: PageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    return redirect("/auth/login?callbackUrl=/settings/teams");
  }

  const params = await _params;
  const teamId = Number(params?.id);
  if (!Number.isInteger(teamId)) {
    notFound();
  }

  // Membership check happens here, not in a layout, per architecture-page-level-auth.md.
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
    select: { id: true },
  });
  if (!membership) {
    notFound();
  }

  return <MembersView teamId={teamId} />;
};

export default Page;
