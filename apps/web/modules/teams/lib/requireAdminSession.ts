import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Page-level authorization for the admin/teams pages (see agents/rules/architecture-page-level-auth.md).
 * The shared (admin-layout) layout.tsx already redirects non-admins, but layouts aren't
 * re-evaluated on every client-side navigation between sibling admin pages, so each page also
 * checks for itself before touching any team data.
 */
export async function requireAdminSession() {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (session?.user?.role !== UserPermissionRole.ADMIN) {
    redirect("/settings/my-account/profile");
  }
  return session;
}
