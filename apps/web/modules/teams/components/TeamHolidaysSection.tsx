"use client";

import dayjs from "@calcom/dayjs";
import { getHolidayEmoji } from "@calcom/lib/holidays/getHolidayEmoji";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Select, Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { useMemo } from "react";
import type { CSSObjectWithLabel } from "react-select";

type HolidayWithStatus = RouterOutputs["viewer"]["teams"]["holidaySettings"]["holidays"][number];
type CountryOption = { value: string; label: string };

const HolidayListItem = ({
  holiday,
  canManage,
  disabled,
  onToggle,
}: {
  holiday: HolidayWithStatus;
  canManage: boolean;
  disabled: boolean;
  onToggle: (holidayId: string, enabled: boolean) => void;
}) => (
  <div className="flex items-center justify-between border-subtle border-b px-5 py-4 last:border-b-0">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-subtle">
        <span className="text-xl">{getHolidayEmoji(holiday.name)}</span>
      </div>
      <div>
        <p className={holiday.enabled ? "font-medium text-emphasis" : "font-medium text-muted"}>
          {holiday.name}
        </p>
        <p className={holiday.enabled ? "text-sm text-subtle" : "text-muted text-sm"}>
          {dayjs(holiday.date).format("D MMM, YYYY")}
        </p>
      </div>
    </div>
    <Switch
      checked={holiday.enabled}
      disabled={!canManage || disabled}
      onCheckedChange={(checked) => onToggle(holiday.id, checked)}
    />
  </div>
);

const getFlagEmoji = (countryCode: string): string | null => {
  if (countryCode.length !== 2) return null;
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

/** `asAdmin`: platform admin managing any team from /settings/admin/teams, not a member of it -
 * see agents/rules/architecture-page-level-auth.md. */
const TeamHolidaysSection = ({
  teamId,
  canManage,
  asAdmin = false,
}: {
  teamId: number;
  canManage: boolean;
  asAdmin?: boolean;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: countries, isLoading: isLoadingCountries } =
    trpc.viewer.holidays.getSupportedCountries.useQuery();
  const settingsQuery = trpc.viewer.teams.holidaySettings.useQuery({ teamId }, { enabled: !asAdmin });
  const adminSettingsQuery = trpc.viewer.admin.teams.holidaySettings.useQuery(
    { teamId },
    { enabled: asAdmin }
  );
  const settings = asAdmin ? adminSettingsQuery.data : settingsQuery.data;
  const isLoadingSettings = asAdmin ? adminSettingsQuery.isPending : settingsQuery.isPending;

  const countryOptions: CountryOption[] = useMemo(
    () => [
      { value: "", label: t("select_country") },
      ...(countries || []).map((country) => {
        const flag = getFlagEmoji(country.code);
        return { value: country.code, label: flag ? `${flag} ${country.name}` : country.name };
      }),
    ],
    [countries, t]
  );

  const selectedCountry =
    countryOptions.find((option) => option.value === (settings?.countryCode || "")) || countryOptions[0];

  const invalidateSettings = () =>
    Promise.all([
      utils.viewer.teams.holidaySettings.invalidate({ teamId }),
      utils.viewer.admin.teams.holidaySettings.invalidate({ teamId }),
    ]);

  const updateSettingsMutation = trpc.viewer.teams.holidayUpdateSettings.useMutation({
    onSuccess: async () => {
      await invalidateSettings();
      showToast(t("holiday_settings_updated"), "success");
    },
    onError: () => showToast(t("error_updating_settings"), "error"),
  });

  const adminUpdateSettingsMutation = trpc.viewer.admin.teams.holidayUpdateSettings.useMutation({
    onSuccess: async () => {
      await invalidateSettings();
      showToast(t("holiday_settings_updated"), "success");
    },
    onError: () => showToast(t("error_updating_settings"), "error"),
  });

  const toggleHolidayMutation = trpc.viewer.teams.holidayToggle.useMutation({
    onSuccess: invalidateSettings,
    onError: () => showToast(t("error_updating_settings"), "error"),
  });

  const adminToggleHolidayMutation = trpc.viewer.admin.teams.holidayToggle.useMutation({
    onSuccess: invalidateSettings,
    onError: () => showToast(t("error_updating_settings"), "error"),
  });

  const activeUpdateSettingsMutation = asAdmin ? adminUpdateSettingsMutation : updateSettingsMutation;
  const activeToggleHolidayMutation = asAdmin ? adminToggleHolidayMutation : toggleHolidayMutation;

  const isLoading = isLoadingCountries || isLoadingSettings;

  const holidaysBody = (() => {
    if (isLoading) return <SkeletonText className="h-24 w-full" />;

    if (!settings?.countryCode) {
      return (
        <div className="flex flex-col items-center rounded-md bg-default py-14 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emphasis">
            <Icon name="calendar" className="h-8 w-8 text-default" />
          </div>
          <h4 className="mb-1 font-medium text-emphasis">{t("no_holidays_selected")}</h4>
          <p className="text-sm text-subtle">{t("select_country_to_see_holidays")}</p>
        </div>
      );
    }

    if (!settings.holidays || settings.holidays.length === 0) {
      return (
        <div className="overflow-hidden rounded-md border border-subtle bg-default">
          <div className="py-8 text-center text-sm text-subtle">{t("no_holidays_found_for_country")}</div>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-md border border-subtle bg-default">
        {settings.holidays.map((holiday: HolidayWithStatus) => (
          <HolidayListItem
            key={holiday.id}
            holiday={holiday}
            canManage={canManage}
            disabled={activeToggleHolidayMutation.isPending}
            onToggle={(holidayId, enabled) =>
              activeToggleHolidayMutation.mutate({ teamId, holidayId, enabled })
            }
          />
        ))}
      </div>
    );
  })();

  return (
    <div className="overflow-hidden rounded-lg border border-subtle bg-muted p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-emphasis">{t("public_holidays")}</h3>
          <p className="text-sm text-subtle">{t("team_holidays_description")}</p>
        </div>
        {isLoadingCountries ? (
          <SkeletonText className="h-9 w-36" />
        ) : (
          <Select
            className="w-auto min-w-[180px]"
            isDisabled={!canManage}
            value={selectedCountry}
            onChange={(option) =>
              activeUpdateSettingsMutation.mutate({
                teamId,
                countryCode: option?.value || null,
                resetDisabledHolidays: true,
              })
            }
            options={countryOptions}
            menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            menuPlacement="auto"
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) as CSSObjectWithLabel }}
          />
        )}
      </div>

      {holidaysBody}
    </div>
  );
};

export default TeamHolidaysSection;
