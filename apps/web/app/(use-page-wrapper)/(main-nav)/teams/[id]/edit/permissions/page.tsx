import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PermissionsView from "~/teams/views/permissions-view";
import { ShellMainAppDir } from "../../../../ShellMainAppDir";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("permissions"),
    (t) => t("team_permissions_description"),
    undefined,
    undefined,
    `/teams/${(await params).id}/edit/permissions`
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
  // Any accepted member can view the matrix (read-only for everyone but the owner) - editing is
  // enforced separately, owner-only, by TeamPermissionSettingService.updateSettings.
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
    select: { id: true },
  });
  if (!membership) {
    notFound();
  }

  const t = await getTranslate();

  return (
    <ShellMainAppDir
      heading={t("permissions")}
      subtitle={t("team_permissions_description")}
      backPath="/teams">
      <PermissionsView teamId={teamId} />
    </ShellMainAppDir>
  );
};

export default Page;
