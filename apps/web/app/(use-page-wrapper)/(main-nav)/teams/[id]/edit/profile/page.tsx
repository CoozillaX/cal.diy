import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ProfileView from "~/teams/views/profile-view";
import { ShellMainAppDir } from "../../../../ShellMainAppDir";

const ADMIN_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("edit_team_description"),
    undefined,
    undefined,
    `/teams/${(await params).id}/edit/profile`
  );

const Page = async ({ params: _params }: PageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    return redirect("/auth/login?callbackUrl=/teams");
  }

  const params = await _params;
  const teamId = Number(params?.id);
  if (!Number.isInteger(teamId)) {
    notFound();
  }

  // Membership check happens here, not in a layout, per architecture-page-level-auth.md.
  // Only owners/admins may edit team settings - everyone else gets routed to Members instead
  // (see TeamsTable), so landing here without that role means the URL was typed/bookmarked.
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
    select: { role: true },
  });
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    notFound();
  }

  const t = await getTranslate();

  return (
    <ShellMainAppDir heading={t("profile")} subtitle={t("edit_team_description")} backPath="/teams">
      <ProfileView teamId={teamId} />
    </ShellMainAppDir>
  );
};

export default Page;
