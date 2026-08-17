import { convertFacetedValuesToMap, type FacetedValue } from "@calcom/features/data-table";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import type { RowData, Table } from "@tanstack/react-table";
import { useCallback } from "react";
import { useEventTypes } from "./useEventTypes";
import { useMembers } from "./useMembers";

interface UseFacetedUniqueValuesOptions {
  canReadOthersBookings: boolean;
}

export function useFacetedUniqueValues({
  canReadOthersBookings,
}: UseFacetedUniqueValuesOptions): <TData extends RowData>(
  table: Table<TData>,
  columnId: string
) => () => Map<FacetedValue, number> {
  const eventTypes = useEventTypes();
  // trpc.viewer.teams.list is a plain authedProcedure - same query
  // TeamsFilter.tsx uses for the Event Types page's team filter. This was
  // hardcoded to `undefined` (silently emptying the bookings page's "team"
  // filter options - both the checkbox list and its search, since there was
  // nothing to search) somewhere in this fork's original refactor.
  const { data: teams } = trpc.viewer.teams.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  // Same story as `teams` above - hardcoded to `undefined`, so the "member"
  // filter (canReadOthersBookings === true) had no options either.
  const members = useMembers();
  const { data: currentUser } = useMeQuery();

  return useCallback(
    <TData extends RowData>(_: Table<TData>, columnId: string) =>
      (): Map<FacetedValue, number> => {
        if (columnId === "eventTypeId") {
          return convertFacetedValuesToMap(eventTypes || []);
        } else if (columnId === "teamId") {
          return convertFacetedValuesToMap(
            (teams || []).map((team) => ({
              label: team.name,
              value: team.id,
            }))
          );
        } else if (columnId === "userId") {
          if (!canReadOthersBookings) {
            if (!currentUser) {
              return new Map<FacetedValue, number>();
            }
            return convertFacetedValuesToMap([
              {
                label: currentUser.name || currentUser.email,
                value: currentUser.id,
              },
            ]);
          }
          return convertFacetedValuesToMap(
            (members || [])
              .map((member) => ({
                label: member.name,
                value: member.id,
              }))
              .filter((option): option is { label: string; value: number } => Boolean(option.label))
          );
        }
        return new Map<FacetedValue, number>();
      },
    [eventTypes, teams, members, canReadOthersBookings, currentUser]
  );
}
