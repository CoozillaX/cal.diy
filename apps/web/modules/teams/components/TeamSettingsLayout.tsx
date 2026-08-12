"use client";

import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";
import { HorizontalTabs, VerticalTabs } from "@calcom/ui/components/navigation";
import { useCanManageTeam } from "~/teams/hooks/useCanManageTeam";

type Props = {
  teamId: number;
  children: React.ReactNode;
};

// HorizontalTabItem/VerticalTabItem translate `name` themselves, so these are i18n keys, not translated strings.
const useTeamTabs = (teamId: number): VerticalTabItemProps[] => {
  // Profile edits the team's own settings, so only owners/admins get that tab - everyone
  // else lands on Members (see TeamsTable, which sends them here in the first place).
  const canManage = useCanManageTeam(teamId);

  return [
    ...(canManage ? [{ name: "profile", href: `/teams/${teamId}/edit/profile`, icon: "user" as const }] : []),
    { name: "members", href: `/teams/${teamId}/edit/members`, icon: "users" as const },
    { name: "time_off", href: `/teams/${teamId}/edit/time-off`, icon: "calendar-x-2" as const },
    ...(canManage
      ? [{ name: "permissions", href: `/teams/${teamId}/edit/permissions`, icon: "lock" as const }]
      : []),
  ];
};

/** Mirrors the event-type edit layout: a sticky vertical nav on the left with content on the
 * right at xl+, collapsing to horizontal tabs above the content on smaller screens. */
const TeamSettingsLayout = ({ teamId, children }: Props) => {
  const tabs = useTeamTabs(teamId);

  return (
    <div className="flex flex-col xl:flex-row xl:space-x-6">
      <div className="hidden xl:block">
        <VerticalTabs
          className="primary-navigation w-64"
          tabs={tabs}
          sticky
          stickyOffset="var(--navbar-height, 64px)"
          linkShallow
          itemClassname="items-start"
        />
      </div>
      <div className="p-2 md:mx-0 md:p-0 xl:hidden">
        <HorizontalTabs tabs={tabs} linkShallow />
      </div>
      <div className="mt-4 min-w-0 flex-1 xl:mt-0">{children}</div>
    </div>
  );
};

export default TeamSettingsLayout;
