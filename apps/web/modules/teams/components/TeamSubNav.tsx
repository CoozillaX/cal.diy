"use client";

import HorizontalTabs from "@calcom/ui/components/navigation/tabs/HorizontalTabs";

// HorizontalTabItem translates `name` itself, so these are i18n keys, not translated strings.
const TeamSubNav = ({ teamId }: { teamId: number }) => (
  <HorizontalTabs
    tabs={[
      { name: "members", href: `/teams/${teamId}/members`, icon: "users" },
      { name: "time_off", href: `/teams/${teamId}/time-off`, icon: "calendar-x-2" },
    ]}
  />
);

export default TeamSubNav;
