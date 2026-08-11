"use client";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { TextField } from "@calcom/ui/components/form";
import { DropdownActions, Table } from "@calcom/ui/components/table";
import { keepPreviousData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditTeamDialog from "~/teams/components/EditTeamDialog";

const { Header, ColumnTitle, Body, Row, Cell } = Table;

type Team = RouterOutputs["viewer"]["teams"]["listPaginated"]["rows"][number];

const ADMIN_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];
const FETCH_LIMIT = 25;

const roleBadgeVariant = (role: Team["role"]): "orange" | "blue" | "gray" => {
  if (role === MembershipRole.OWNER) return "orange";
  if (role === MembershipRole.ADMIN) return "blue";
  return "gray";
};

export const TeamsTable = () => {
  const { t } = useLocale();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const { data, fetchNextPage, isFetching, isPending } = trpc.viewer.teams.listPaginated.useInfiniteQuery(
    {
      limit: FETCH_LIMIT,
      searchTerm: debouncedSearchTerm,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
    }
  );

  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]);
  const totalRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;
  const totalFetched = flatData.length;

  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && totalFetched < totalRowCount) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalRowCount]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  return (
    <div className="flex flex-col gap-3">
      <TextField
        placeholder={t("search")}
        label={t("search")}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <p className="text-sm text-subtle">
        {isFetching && totalFetched === 0
          ? t("loading")
          : `${t("showing_x_of_y", { x: totalFetched, y: totalRowCount })}`}
      </p>

      {!isPending && totalRowCount === 0 && (
        <EmptyScreen Icon="users" headline={t("my_teams")} description={t("add_team_members_description")} />
      )}

      {(isPending || totalRowCount > 0) && (
        <div
          className="rounded-md border border-subtle"
          ref={tableContainerRef}
          onScroll={() => fetchMoreOnBottomReached(tableContainerRef.current)}
          style={{
            height: "calc(100vh - 30vh)",
            overflow: "auto",
          }}>
          <Table>
            <Header>
              <ColumnTitle widthClassNames="w-auto">{t("team")}</ColumnTitle>
              <ColumnTitle>{t("role")}</ColumnTitle>
              <ColumnTitle>{t("members")}</ColumnTitle>
              <ColumnTitle widthClassNames="w-auto">
                <span className="sr-only">{t("edit")}</span>
              </ColumnTitle>
            </Header>
            <Body>
              {flatData.map((team) => (
                <Row key={team.id}>
                  <Cell widthClassNames="w-auto">
                    <div className="flex items-center gap-2">
                      <Avatar size="sm" alt={team.name} imageSrc={team.logoUrl ?? undefined} />
                      <span className="font-medium text-emphasis">{team.name}</span>
                    </div>
                  </Cell>
                  <Cell>
                    {team.role && (
                      <Badge variant={roleBadgeVariant(team.role)}>{t(team.role.toLowerCase())}</Badge>
                    )}
                  </Cell>
                  <Cell>{team.memberCount}</Cell>
                  <Cell widthClassNames="w-auto">
                    <div className="flex w-full justify-end">
                      <DropdownActions
                        actions={[
                          ...(team.role && ADMIN_ROLES.includes(team.role)
                            ? [
                                {
                                  id: "edit",
                                  label: t("edit"),
                                  icon: "pencil" as const,
                                  onClick: () => setEditingTeam(team),
                                },
                              ]
                            : []),
                          {
                            id: "members",
                            label: t("members"),
                            icon: "users",
                            href: `/teams/${team.id}/members`,
                          },
                        ]}
                      />
                    </div>
                  </Cell>
                </Row>
              ))}
            </Body>
          </Table>
        </div>
      )}

      <EditTeamDialog
        team={editingTeam}
        open={!!editingTeam}
        onOpenChange={(open) => !open && setEditingTeam(null)}
      />
    </div>
  );
};
