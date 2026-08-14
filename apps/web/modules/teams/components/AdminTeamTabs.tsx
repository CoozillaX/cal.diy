"use client";

import { HorizontalTabs } from "@calcom/ui/components/navigation";

/** name is an i18n key - HorizontalTabItem translates it itself. */
export const AdminTeamTabs = ({ teamId }: { teamId: number }) => (
  <HorizontalTabs
    tabs={[
      { name: "edit", href: `/settings/admin/teams/${teamId}/edit`, icon: "pencil" as const },
      { name: "team_members", href: `/settings/admin/teams/${teamId}/members`, icon: "users" as const },
    ]}
  />
);
