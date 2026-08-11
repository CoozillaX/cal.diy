"use client";

import type { CheckedSelectOption } from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import { CheckedTeamSelect } from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
import type { EventTypeSetupProps, FormValues, Host } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { Label, SelectField, Switch } from "@calcom/ui/components/form";
import { useMemo } from "react";
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
  const isRRWeightsEnabled = formMethods.watch("isRRWeightsEnabled") ?? eventType.isRRWeightsEnabled;

  const schedulingTypeOptions = TEAM_SCHEDULING_TYPES.map((value) => ({
    value,
    label: t(value === SchedulingType.ROUND_ROBIN ? "round_robin" : "collective"),
    description: t(
      value === SchedulingType.ROUND_ROBIN ? "round_robin_description" : "collective_description"
    ),
  }));

  // Hooks must run unconditionally on every render, so these are computed before the early
  // return below even though their result goes unused for MANAGED event types.
  const memberOptions: CheckedSelectOption[] = useMemo(
    () =>
      teamMembers.map((member) => ({
        value: String(member.id),
        label: member.name || member.email,
        avatar: member.avatar,
        defaultScheduleId: member.defaultScheduleId,
        groupId: null,
      })),
    [teamMembers]
  );

  const selectedOptions: CheckedSelectOption[] = useMemo(
    () =>
      hosts.flatMap((host) => {
        const member = teamMembers.find((m) => m.id === host.userId);
        if (!member) return [];
        return [
          {
            value: String(host.userId),
            label: member.name || member.email,
            avatar: member.avatar,
            priority: host.priority,
            weight: host.weight,
            isFixed: host.isFixed,
            groupId: host.groupId,
          },
        ];
      }),
    [hosts, teamMembers]
  );

  // Managed event types push their config out to each member's own event type instead of
  // listing hosts here - this tab has nothing meaningful to assign for that scheduling type.
  if (schedulingType === SchedulingType.MANAGED) {
    return null;
  }

  const handleHostsChange = (value: readonly CheckedSelectOption[]) => {
    const nextHosts: Host[] = value.map((option) => {
      const userId = parseInt(option.value, 10);
      return {
        userId,
        isFixed: schedulingType === SchedulingType.COLLECTIVE || !!option.isFixed,
        priority: option.priority ?? DEFAULT_HOST_PRIORITY,
        weight: option.weight ?? DEFAULT_HOST_WEIGHT,
        // Priority/weight edits round-trip through CheckedSelectOption, which has no
        // scheduleId field - preserve whatever the host already had instead of losing it.
        scheduleId: hosts.find((host) => host.userId === userId)?.scheduleId ?? null,
        groupId: option.groupId,
      };
    });
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

      {schedulingType === SchedulingType.ROUND_ROBIN && (
        <div>
          <Switch
            label={t("enable_weights")}
            checked={!!isRRWeightsEnabled}
            onCheckedChange={(checked) =>
              formMethods.setValue("isRRWeightsEnabled", checked, { shouldDirty: true })
            }
          />
          <p className="text-subtle mt-1 text-sm">
            <LearnMoreLink
              t={t}
              i18nKey="weights_description"
              href="https://cal.com/help/how-it-works/round-robin"
            />
          </p>
        </div>
      )}

      <div>
        <Label>{t("hosts")}</Label>
        <CheckedTeamSelect
          groupId={null}
          isRRWeightsEnabled={schedulingType === SchedulingType.ROUND_ROBIN && !!isRRWeightsEnabled}
          options={memberOptions}
          value={selectedOptions}
          onChange={handleHostsChange}
        />
      </div>

      {hosts.length === 0 && <p className="text-error text-sm">{t("no_hosts_selected_warning")}</p>}
    </div>
  );
};

export default EventTeamAssignmentTabWebWrapper;
