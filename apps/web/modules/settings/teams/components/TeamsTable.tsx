"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { type ColumnDef, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { DataTableToolbar, DataTableWrapper } from "~/data-table/components";
import { DataTableProvider } from "~/data-table/DataTableProvider";
import { useDataTable } from "~/data-table/hooks/useDataTable";

type Team = RouterOutputs["viewer"]["teams"]["list"][number];

const roleBadgeVariant = (role: Team["role"]): "orange" | "blue" | "gray" => {
  if (role === MembershipRole.OWNER) return "orange";
  if (role === MembershipRole.ADMIN) return "blue";
  return "gray";
};

const TeamsTableContent = ({ teams, isPending }: { teams: Team[]; isPending: boolean }) => {
  const { t } = useLocale();
  const { searchTerm, pageIndex, pageSize, setPageIndex, setPageSize } = useDataTable();

  const filteredTeams = useMemo(() => {
    if (!searchTerm) return teams;
    const query = searchTerm.toLowerCase();
    return teams.filter((team) => team.name.toLowerCase().includes(query));
  }, [teams, searchTerm]);

  const pagedTeams = useMemo(
    () => filteredTeams.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [filteredTeams, pageIndex, pageSize]
  );

  const columns = useMemo<ColumnDef<Team>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: t("team"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar size="sm" alt={row.original.name} imageSrc={row.original.logoUrl ?? undefined} />
            <span className="text-emphasis text-sm font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        id: "role",
        accessorKey: "role",
        header: t("role"),
        cell: ({ row }) =>
          row.original.role && (
            <Badge variant={roleBadgeVariant(row.original.role)}>{t(row.original.role.toLowerCase())}</Badge>
          ),
      },
      {
        id: "memberCount",
        accessorKey: "memberCount",
        header: t("members"),
        cell: ({ row }) => <span className="text-default text-sm">{row.original.memberCount}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Link href={`/teams/${row.original.id}/members`}>
            <Button type="button" color="secondary" size="sm" StartIcon="users">
              {t("members")}
            </Button>
          </Link>
        ),
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: pagedTeams,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(filteredTeams.length / pageSize)),
    state: { pagination: { pageIndex, pageSize } },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    getRowId: (row) => String(row.id),
  });

  return (
    <DataTableWrapper
      table={table}
      isPending={isPending}
      paginationMode="standard"
      totalRowCount={filteredTeams.length}
      ToolbarLeft={<DataTableToolbar.SearchBar />}
      EmptyView={
        <EmptyScreen Icon="users" headline={t("my_teams")} description={t("add_team_members_description")} />
      }
    />
  );
};

export const TeamsTable = ({ teams, isPending }: { teams: Team[]; isPending: boolean }) => {
  const pathname = usePathname();
  if (!pathname) return null;
  return (
    <DataTableProvider tableIdentifier={pathname} defaultPageSize={10}>
      <TeamsTableContent teams={teams} isPending={isPending} />
    </DataTableProvider>
  );
};
