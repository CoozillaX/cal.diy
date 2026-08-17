import { useSession } from "next-auth/react";
import { useMemo } from "react";

import { trpc } from "@calcom/trpc/react";

// The "member" (userId) bookings filter needs every member across every
// team the current user belongs to, but there's no single trpc procedure
// for that - viewer.teams.listMembers is per-team (ZListMembersInputSchema
// requires a teamId). trpc.useQueries batches one listMembers call per team
// (same pattern useQuery normally uses, just for a dynamic-length list of
// queries) - see @trpc/react-query's TRPCUseQueries, already part of this
// app's trpc client (createTRPCNext re-exports it), just not used anywhere
// else in this codebase yet.
export function useMembers() {
  const { data: user } = useSession();

  const teamsQuery = trpc.viewer.teams.list.useQuery(undefined, {
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  const teamIds = useMemo(() => teamsQuery.data?.map((team) => team.id) ?? [], [teamsQuery.data]);

  const memberQueries = trpc.useQueries((t) =>
    teamIds.map((teamId) =>
      t.viewer.teams.listMembers({ teamId }, { enabled: !!user, refetchOnWindowFocus: false })
    )
  );

  return useMemo(() => {
    // Mirrors the loading-state shape the stubbed `undefined` had:
    // undefined while anything is still loading, an array (possibly empty)
    // once everything has settled - useActiveFiltersValidator's
    // isDataLoaded check relies on this.
    if (teamsQuery.isPending) return undefined;
    if (memberQueries.some((query) => query.isPending)) return undefined;

    // A member of more than one of the current teams should only appear
    // once in the filter, not once per team.
    const membersById = new Map<number, { id: number; name: string | null }>();
    for (const query of memberQueries) {
      for (const membership of query.data ?? []) {
        membersById.set(membership.user.id, { id: membership.user.id, name: membership.user.name });
      }
    }
    return Array.from(membersById.values());
  }, [teamsQuery.isPending, memberQueries]);
}
