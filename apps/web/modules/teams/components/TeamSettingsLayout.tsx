"use client";

import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";
import { HorizontalTabs, VerticalTabs } from "@calcom/ui/components/navigation";

type Props = {
  teamId: number;
  children: React.ReactNode;
  /** Platform-admin managing any team from /settings/admin/teams, not a member of this one -
   * see agents/rules/architecture-page-level-auth.md. Points tabs at the admin routes and drops
   * time-off/permissions, which don't have an admin-unrestricted backend yet. */
  asAdmin?: boolean;
};

// HorizontalTabItem/VerticalTabItem translate `name` themselves, so these are i18n keys, not translated strings.
//
// All four tabs are reachable by every member - Profile and Permissions used to be hidden
// outright for non-admin/owner members, but that meant members couldn't even discover them.
// Each view now disables its own controls (form fields, save button, role selects) instead,
// so members can see what's there without being able to change it.
const useTeamTabs = (teamId: number, asAdmin: boolean): VerticalTabItemProps[] => {
  const basePath = asAdmin ? `/settings/admin/teams/${teamId}/edit` : `/teams/${teamId}/edit`;
  const tabs: VerticalTabItemProps[] = [
    { name: "profile", href: `${basePath}/profile`, icon: "user" as const },
    { name: "members", href: `${basePath}/members`, icon: "users" as const },
  ];
  if (asAdmin) return tabs;
  return [
    ...tabs,
    { name: "time_off", href: `${basePath}/time-off`, icon: "calendar-x-2" as const },
    { name: "permissions", href: `${basePath}/permissions`, icon: "lock" as const },
  ];
};

/** Mirrors the event-type edit layout: a sticky vertical nav on the left with content on the
 * right at xl+, collapsing to horizontal tabs above the content on smaller screens. */
const TeamSettingsLayout = ({ teamId, children, asAdmin = false }: Props) => {
  const tabs = useTeamTabs(teamId, asAdmin);

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
