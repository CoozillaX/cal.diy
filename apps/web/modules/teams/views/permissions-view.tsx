"use client";

import {
  TEAM_PERMISSION_CATALOG,
  type TeamPermissionCategory,
  type TeamPermissionKey,
} from "@calcom/features/teams/lib/teamPermissions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui/components/form";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { useMemo } from "react";
import TeamSettingsLayout from "~/teams/components/TeamSettingsLayout";
import { useIsTeamOwner } from "~/teams/hooks/useIsTeamOwner";

type RoleOption = { value: MembershipRole; label: string };

// Keyed by TeamPermissionKey - the i18n copy each catalog row renders. Kept in the web layer
// (not packages/features) since packages/features must stay framework/i18n-agnostic.
const PERMISSION_COPY: Record<TeamPermissionKey, { labelKey: string; descriptionKey: string }> = {
  "eventType.create": {
    labelKey: "team_permission_event_type_create",
    descriptionKey: "team_permission_event_type_create_description",
  },
  "eventType.duplicate": {
    labelKey: "team_permission_event_type_duplicate",
    descriptionKey: "team_permission_event_type_duplicate_description",
  },
  "eventType.update": {
    labelKey: "team_permission_event_type_update",
    descriptionKey: "team_permission_event_type_update_description",
  },
  "booking.confirm": {
    labelKey: "team_permission_booking_confirm",
    descriptionKey: "team_permission_booking_confirm_description",
  },
  "booking.readTeamBookings": {
    labelKey: "team_permission_booking_read_team_bookings",
    descriptionKey: "team_permission_booking_read_team_bookings_description",
  },
  "booking.editLocation": {
    labelKey: "team_permission_booking_edit_location",
    descriptionKey: "team_permission_booking_edit_location_description",
  },
  "booking.addGuests": {
    labelKey: "team_permission_booking_add_guests",
    descriptionKey: "team_permission_booking_add_guests_description",
  },
  "booking.requestReschedule": {
    labelKey: "team_permission_booking_request_reschedule",
    descriptionKey: "team_permission_booking_request_reschedule_description",
  },
  "booking.cancel": {
    labelKey: "team_permission_booking_cancel",
    descriptionKey: "team_permission_booking_cancel_description",
  },
  "booking.markNoShow": {
    labelKey: "team_permission_booking_mark_no_show",
    descriptionKey: "team_permission_booking_mark_no_show_description",
  },
  "booking.reassign": {
    labelKey: "team_permission_booking_reassign",
    descriptionKey: "team_permission_booking_reassign_description",
  },
};

const CATEGORY_LABEL_KEY: Record<TeamPermissionCategory, string> = {
  event_types: "event_types_page_title",
  bookings: "bookings",
};

const PermissionRow = ({
  permissionKey,
  minimumRole,
  roleOptions,
  disabled,
  onChange,
}: {
  permissionKey: TeamPermissionKey;
  minimumRole: MembershipRole;
  roleOptions: RoleOption[];
  disabled: boolean;
  onChange: (permissionKey: TeamPermissionKey, minimumRole: MembershipRole) => void;
}) => {
  const { t } = useLocale();
  const copy = PERMISSION_COPY[permissionKey];
  const selected = roleOptions.find((option) => option.value === minimumRole) ?? roleOptions[0];

  return (
    <div className="flex items-center justify-between border-subtle border-b px-5 py-4 last:border-b-0">
      <div>
        <p className="font-medium text-emphasis">{t(copy.labelKey)}</p>
        <p className="text-sm text-subtle">{t(copy.descriptionKey)}</p>
      </div>
      <Select<RoleOption>
        className="w-36"
        isDisabled={disabled}
        value={selected}
        options={roleOptions}
        onChange={(option) => option && onChange(permissionKey, option.value)}
      />
    </div>
  );
};

/** Content only - the page (rendered inside the main app shell) owns the heading. Reachable by
 * owners/admins (TeamSettingsLayout hides the tab for members) - editing is owner-only, admins
 * see the same matrix read-only. */
const PermissionsView = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const isOwner = useIsTeamOwner(teamId);

  const { data: settings, isPending } = trpc.viewer.teams.getPermissionSettings.useQuery({ teamId });

  const updateMutation = trpc.viewer.teams.updatePermissionSettings.useMutation({
    onSuccess: (data) => {
      utils.viewer.teams.getPermissionSettings.setData({ teamId }, data);
      showToast(t("team_permissions_updated"), "success");
    },
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  const roleOptions: RoleOption[] = useMemo(
    () => [
      { value: MembershipRole.MEMBER, label: t("member") },
      { value: MembershipRole.ADMIN, label: t("admin") },
      { value: MembershipRole.OWNER, label: t("owner") },
    ],
    [t]
  );

  const settingsByKey = useMemo(
    () => new Map((settings ?? []).map((setting) => [setting.permissionKey, setting.minimumRole])),
    [settings]
  );

  const handleChange = (permissionKey: TeamPermissionKey, minimumRole: MembershipRole) => {
    const nextSettings = TEAM_PERMISSION_CATALOG.map(({ key }) => ({
      permissionKey: key,
      minimumRole: key === permissionKey ? minimumRole : (settingsByKey.get(key) ?? minimumRole),
    }));
    updateMutation.mutate({ teamId, settings: nextSettings });
  };

  return (
    <TeamSettingsLayout teamId={teamId}>
      <div className="mb-4">
        <p className="text-sm text-subtle">
          {isOwner ? t("team_permissions_description") : t("team_permissions_owner_only_notice")}
        </p>
      </div>

      {isPending ? (
        <SkeletonContainer>
          <SkeletonText className="mb-4 h-8 w-full" />
          <SkeletonText className="h-8 w-full" />
        </SkeletonContainer>
      ) : (
        (["event_types", "bookings"] as const).map((category) => (
          <div key={category} className="mb-6">
            <h3 className="mb-2 font-semibold text-emphasis">{t(CATEGORY_LABEL_KEY[category])}</h3>
            <div className="overflow-hidden rounded-md border border-subtle bg-default">
              {TEAM_PERMISSION_CATALOG.filter((entry) => entry.category === category).map((entry) => (
                <PermissionRow
                  key={entry.key}
                  permissionKey={entry.key}
                  minimumRole={settingsByKey.get(entry.key) ?? entry.defaultMinimumRole}
                  roleOptions={roleOptions}
                  disabled={!isOwner || updateMutation.isPending}
                  onChange={handleChange}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </TeamSettingsLayout>
  );
};

export default PermissionsView;
