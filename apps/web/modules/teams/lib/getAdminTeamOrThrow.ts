import { getTeamService } from "@calcom/features/teams/di/TeamService.container";
import type { Params } from "app/_types";
import { z } from "zod";

const teamIdSchema = z.object({ id: z.coerce.number() });

/** Shared by the admin/teams/[id]/edit and /members pages - parses the route param and loads
 * the team. Does not check the caller's role: each page still calls requireAdminSession itself
 * (see agents/rules/architecture-page-level-auth.md) before rendering anything derived from this. */
export async function getAdminTeamOrThrow(params: Params) {
  const input = teamIdSchema.safeParse(params);
  if (!input.success) throw new Error("Invalid access");

  const teamService = getTeamService();
  return teamService.adminGetTeam({ teamId: input.data.id });
}
