import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

async function findMembership(userId: number, teamId: number) {
  return prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true, accepted: true },
  });
}

export async function assertTeamMember(userId: number, teamId: number) {
  const membership = await findMembership(userId, teamId);
  if (!membership?.accepted) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this team" });
  }
}

export async function assertTeamAdminOrOwner(userId: number, teamId: number) {
  const membership = await findMembership(userId, teamId);
  if (!membership?.accepted || !checkAdminOrOwner(membership.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only team owners and admins can do this" });
  }
}
