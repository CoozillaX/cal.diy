"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { TextField } from "@calcom/ui/components/form";
import { DropdownActions, Table } from "@calcom/ui/components/table";
import { useMemo, useState } from "react";
import EditTeamDialog from "~/teams/components/EditTeamDialog";

const { Header, ColumnTitle, Body, Row, Cell } = Table;

type Team = RouterOutputs["viewer"]["teams"]["list"][number];

const ADMIN_ROLES: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

const roleBadgeVariant = (role: Team["role"]): "orange" | "blue" | "gray" => {
  if (role === MembershipRole.OWNER) return "orange";
  if (role === MembershipRole.ADMIN) return "blue";
  return "gray";
};

export const TeamsTable = ({ teams, isPending }: { teams: Team[]; isPending: boolean }) => {
  const { t } = useLocale();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const filteredTeams = useMemo(() => {
    if (!searchTerm) return teams;
    const query = searchTerm.toLowerCase();
    return teams.filter((team) => team.name.toLowerCase().includes(query));
  }, [teams, searchTerm]);

  return (
    <div className="flex flex-col gap-3">
      <TextField
        placeholder={t("search")}
        label={t("search")}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {!isPending && filteredTeams.length === 0 && (
        <EmptyScreen Icon="users" headline={t("my_teams")} description={t("add_team_members_description")} />
      )}

      {(isPending || filteredTeams.length > 0) && (
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
            {filteredTeams.map((team) => (
              <Row key={team.id}>
                <Cell widthClassNames="w-auto">
                  <div className="flex items-center gap-2">
                    <Avatar size="sm" alt={team.name} imageSrc={team.logoUrl ?? undefined} />
                    <span className="text-emphasis font-medium">{team.name}</span>
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
      )}

      <EditTeamDialog
        team={editingTeam}
        open={!!editingTeam}
        onOpenChange={(open) => !open && setEditingTeam(null)}
      />
    </div>
  );
};
