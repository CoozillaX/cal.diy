"use client";

import { HorizontalTabs } from "@calcom/ui/components/navigation";
import { useCanManageTeam } from "~/teams/hooks/useCanManageTeam";

// HorizontalTabItem translates `name` itself, so these are i18n keys, not translated strings.
const TeamSubNav = ({ teamId }: { teamId: number }) => {
  // Profile edits the team's own settings, so only owners/admins get that tab - everyone
  // else lands on Members (see TeamsTable, which sends them here in the first place).
  const canManage = useCanManageTeam(teamId);

  return (
    <HorizontalTabs
      tabs={[
        ...(canManage
          ? [{ name: "profile", href: `/teams/${teamId}/edit/profile`, icon: "user" as const }]
          : []),
        { name: "members", href: `/teams/${teamId}/edit/members`, icon: "users" as const },
        { name: "time_off", href: `/teams/${teamId}/edit/time-off`, icon: "calendar-x-2" as const },
      ]}
    />
  );
};

export default TeamSubNav;
