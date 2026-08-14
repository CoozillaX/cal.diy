"use client";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { TextField } from "@calcom/ui/components/form";
import { DropdownActions, Table } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";
import { keepPreviousData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const { Cell, ColumnTitle, Header, Row } = Table;

const FETCH_LIMIT = 25;

export function AdminTeamsTable() {
  const { t } = useLocale();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [teamToDelete, setTeamToDelete] = useState<number | null>(null);

  const deleteMutation = trpc.viewer.admin.teams.delete.useMutation({
    onSuccess: () => {
      showToast(t("team_has_been_deleted"), "success");
      utils.viewer.admin.teams.list.invalidate();
    },
    onError: (err) => {
      console.error(err.message);
      showToast(t("error_deleting_team"), "error");
    },
    onSettled: () => setTeamToDelete(null),
  });

  const { data, fetchNextPage, isFetching } = trpc.viewer.admin.teams.list.useInfiniteQuery(
    { limit: FETCH_LIMIT, searchTerm: debouncedSearchTerm },
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
        placeholder="team name or slug"
        label={t("search")}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <p className="text-sm text-subtle">
        {isFetching && totalFetched === 0
          ? t("loading")
          : `${t("showing_x_of_y", { x: totalFetched, y: totalRowCount })}`}
      </p>

      <div
        className="rounded-md border border-subtle"
        ref={tableContainerRef}
        onScroll={() => fetchMoreOnBottomReached(tableContainerRef.current)}
        style={{ height: "calc(100vh - 30vh)", overflow: "auto" }}>
        <Table>
          <Header>
            <ColumnTitle widthClassNames="w-auto">{t("team_name")}</ColumnTitle>
            <ColumnTitle>{t("team_owner")}</ColumnTitle>
            <ColumnTitle>{t("team_members")}</ColumnTitle>
            <ColumnTitle widthClassNames="w-auto">
              <span className="sr-only">{t("edit")}</span>
            </ColumnTitle>
          </Header>

          <tbody className="divide-y divide-subtle rounded-md">
            {flatData.map((team) => (
              <Row key={team.id}>
                <Cell widthClassNames="w-auto">
                  <div className="flex min-h-10 items-center">
                    <Avatar size="md" alt={team.name} imageSrc={team.logoUrl} />
                    <div className="ml-4 font-medium text-subtle">
                      <div className="text-default">{team.name}</div>
                      <span className="break-all">/{team.slug}</span>
                    </div>
                  </div>
                </Cell>
                <Cell>{team.owner ? `${team.owner.name} (${team.owner.email})` : "-"}</Cell>
                <Cell>{team.memberCount}</Cell>
                <Cell widthClassNames="w-auto">
                  <div className="flex w-full justify-end">
                    <DropdownActions
                      actions={[
                        {
                          id: "edit",
                          label: t("edit"),
                          href: `/settings/admin/teams/${team.id}/edit`,
                          icon: "pencil" as const,
                        },
                        {
                          id: "delete",
                          label: t("delete"),
                          color: "destructive" as const,
                          onClick: () => setTeamToDelete(team.id),
                          icon: "trash" as const,
                        },
                      ]}
                    />
                  </div>
                </Cell>
              </Row>
            ))}
          </tbody>
        </Table>
        <DeleteTeamDialog
          teamId={teamToDelete}
          onClose={() => setTeamToDelete(null)}
          onConfirm={() => {
            if (!teamToDelete) return;
            deleteMutation.mutate({ teamId: teamToDelete });
          }}
        />
      </div>
    </div>
  );
}

function DeleteTeamDialog({
  teamId,
  onConfirm,
  onClose,
}: {
  teamId: number | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  return (
    <Dialog open={!!teamId} onOpenChange={(open) => (open ? undefined : onClose())}>
      <ConfirmationDialogContent
        title={t("delete_team")}
        confirmBtnText={t("delete")}
        cancelBtnText={t("cancel")}
        variety="danger"
        onConfirm={onConfirm}>
        <p>{t("delete_team_confirmation")}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
