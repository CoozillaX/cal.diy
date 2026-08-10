"use client";

import type { EventTypeSetupProps, FormValues, Host } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Checkbox, SelectField } from "@calcom/ui/components/form";
import { Controller, useFormContext } from "react-hook-form";
import type { EventTypeSetup, TeamMembers } from "../../EventType";

/** Matches the getUsersWithHighestPriority fallback in getLuckyUser.ts - 2 is "Medium" on the 0-4 scale. */
const DEFAULT_HOST_PRIORITY = 2;
/** Matches the round-robin weighting fallback used throughout getLuckyUser.ts. */
const DEFAULT_HOST_WEIGHT = 100;

const TEAM_SCHEDULING_TYPES = [SchedulingType.ROUND_ROBIN, SchedulingType.COLLECTIVE] as const;

const EventTeamAssignmentTabWebWrapper = ({
  eventType,
  teamMembers,
}: {
  orgId: number | null;
  teamMembers: TeamMembers;
  team: EventTypeSetupProps["team"];
  eventType: EventTypeSetup;
}) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  const schedulingType = formMethods.watch("schedulingType") ?? eventType.schedulingType;
  const hosts = formMethods.watch("hosts") ?? [];
  const selectedUserIds = new Set(hosts.map((host) => host.userId));

  const schedulingTypeOptions = TEAM_SCHEDULING_TYPES.map((value) => ({
    value,
    label: t(value === SchedulingType.ROUND_ROBIN ? "round_robin" : "collective"),
    description: t(
      value === SchedulingType.ROUND_ROBIN ? "round_robin_description" : "collective_description"
    ),
  }));

  // Managed event types push their config out to each member's own event type instead of
  // listing hosts here - this tab has nothing meaningful to assign for that scheduling type.
  if (schedulingType === SchedulingType.MANAGED) {
    return null;
  }

  const toggleHost = (userId: number, checked: boolean) => {
    const nextHosts: Host[] = checked
      ? [
          ...hosts,
          {
            userId,
            isFixed: schedulingType === SchedulingType.COLLECTIVE,
            priority: DEFAULT_HOST_PRIORITY,
            weight: DEFAULT_HOST_WEIGHT,
            groupId: null,
          },
        ]
      : hosts.filter((host) => host.userId !== userId);

    formMethods.setValue("hosts", nextHosts, { shouldDirty: true });
  };

  // One-shot client-side action, not a persisted setting: checks every current team member as a
  // host right now. Whoever it selected is just a normal, editable host list from that point on -
  // there's no ongoing "keep this synced to the team" promise to keep, so nothing can drift out of
  // sync with what the toggle implies the way a saved flag could.
  const selectAllMembers = () => {
    const nextHosts: Host[] = teamMembers.map((member) => ({
      userId: member.id,
      isFixed: schedulingType === SchedulingType.COLLECTIVE,
      priority: DEFAULT_HOST_PRIORITY,
      weight: DEFAULT_HOST_WEIGHT,
      groupId: null,
    }));
    formMethods.setValue("hosts", nextHosts, { shouldDirty: true });
  };

  return (
    <div className="stack-y-6">
      <Controller
        name="schedulingType"
        control={formMethods.control}
        render={({ field: { value, onChange } }) => (
          <SelectField
            label={t("scheduling_type")}
            options={schedulingTypeOptions}
            value={schedulingTypeOptions.find((option) => option.value === (value ?? schedulingType))}
            onChange={(option) => {
              if (!option) return;
              onChange(option.value);
              // The server derives each host's isFixed from schedulingType only when it's
              // COLLECTIVE (see update.handler.ts); switching away from COLLECTIVE otherwise
              // keeps whatever isFixed we submit, so keep hosts in sync with the new type here.
              formMethods.setValue(
                "hosts",
                hosts.map((host) => ({ ...host, isFixed: option.value === SchedulingType.COLLECTIVE })),
                { shouldDirty: true }
              );
            }}
          />
        )}
      />

      <div className="border-subtle rounded-lg border">
        <div className="border-subtle flex items-center justify-between border-b px-4 py-3">
          <p className="text-emphasis text-sm font-medium">{t("hosts")}</p>
          <Button
            type="button"
            color="secondary"
            size="sm"
            disabled={teamMembers.length === 0}
            onClick={selectAllMembers}>
            {t("assign_all_team_members")}
          </Button>
        </div>
        {teamMembers.length === 0 && <p className="text-subtle p-4 text-sm">{t("no_members_found")}</p>}
        {teamMembers.map((member, index) => (
          <div
            key={member.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              index === teamMembers.length - 1 ? "" : "border-subtle border-b"
            }`}>
            <Checkbox
              checked={selectedUserIds.has(member.id)}
              onCheckedChange={(checked) => toggleHost(member.id, !!checked)}
            />
            <Avatar size="sm" imageSrc={member.avatar} alt={member.name ?? member.email} />
            <div>
              <p className="text-emphasis text-sm font-medium">{member.name ?? member.email}</p>
              <p className="text-subtle text-sm">{member.email}</p>
            </div>
            {member.membership === MembershipRole.OWNER && <Badge variant="orange">{t("owner")}</Badge>}
          </div>
        ))}
      </div>

      {hosts.length === 0 && <p className="text-error text-sm">{t("no_hosts_selected_warning")}</p>}
    </div>
  );
};

export default EventTeamAssignmentTabWebWrapper;
