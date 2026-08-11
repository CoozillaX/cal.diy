"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { TextField } from "@calcom/ui/components/form";
import { Table } from "@calcom/ui/components/table";
import Link from "next/link";
import { useMemo, useState } from "react";

const { Header, ColumnTitle, Body, Row, Cell } = Table;

type Team = RouterOutputs["viewer"]["teams"]["list"][number];

const roleBadgeVariant = (role: Team["role"]): "orange" | "blue" | "gray" => {
  if (role === MembershipRole.OWNER) return "orange";
  if (role === MembershipRole.ADMIN) return "blue";
  return "gray";
};

export const TeamsTable = ({ teams, isPending }: { teams: Team[]; isPending: boolean }) => {
  const { t } = useLocale();
  const [searchTerm, setSearchTerm] = useState("");

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
              <span className="sr-only">{t("members")}</span>
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
                    <Link href={`/teams/${team.id}/members`}>
                      <Button type="button" color="secondary" size="sm" StartIcon="users">
                        {t("members")}
                      </Button>
                    </Link>
                  </div>
                </Cell>
              </Row>
            ))}
          </Body>
        </Table>
      )}
    </div>
  );
};
