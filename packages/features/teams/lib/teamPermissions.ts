import { MembershipRole } from "@calcom/prisma/enums";

interface TeamPermissionCatalogEntry {
  key: string;
  category: "event_types" | "bookings";
  defaultMinimumRole: MembershipRole;
  /**
   * Reassignment has no live handler in this app (the web UI's reassign mutations are no-ops and
   * the only working implementation lives in the separate apps/api/v2 service) - it's listed here
   * for forward-compatibility, but no call site currently checks it.
   */
  enforced: boolean;
}

const MEMBERSHIP_HIERARCHY: Record<MembershipRole, number> = {
  [MembershipRole.MEMBER]: 1,
  [MembershipRole.ADMIN]: 2,
  [MembershipRole.OWNER]: 3,
};

/** Single source of truth for every action a team can grant a configurable minimum role to. */
export const TEAM_PERMISSIONS = {
  EVENT_TYPE_CREATE: "eventType.create",
  EVENT_TYPE_UPDATE: "eventType.update",
  EVENT_TYPE_DUPLICATE: "eventType.duplicate",
  BOOKING_CONFIRM: "booking.confirm",
  BOOKING_READ_TEAM_BOOKINGS: "booking.readTeamBookings",
  BOOKING_EDIT_LOCATION: "booking.editLocation",
  BOOKING_ADD_GUESTS: "booking.addGuests",
  BOOKING_REQUEST_RESCHEDULE: "booking.requestReschedule",
  BOOKING_CANCEL: "booking.cancel",
  BOOKING_MARK_NO_SHOW: "booking.markNoShow",
  BOOKING_REASSIGN: "booking.reassign",
} as const;

export type TeamPermissionKey = (typeof TEAM_PERMISSIONS)[keyof typeof TEAM_PERMISSIONS];

export type TeamPermissionCategory = TeamPermissionCatalogEntry["category"];

// Creation-type actions (produce a brand-new event type) default to OWNER; every other,
// edit-type action defaults to ADMIN; nothing defaults to MEMBER, so an unconfigured team
// leaves members read-only with respect to this whole catalog.
export const TEAM_PERMISSION_CATALOG: (TeamPermissionCatalogEntry & { key: TeamPermissionKey })[] = [
  {
    key: TEAM_PERMISSIONS.EVENT_TYPE_CREATE,
    category: "event_types",
    defaultMinimumRole: MembershipRole.OWNER,
    enforced: true,
  },
  {
    key: TEAM_PERMISSIONS.EVENT_TYPE_DUPLICATE,
    category: "event_types",
    defaultMinimumRole: MembershipRole.OWNER,
    enforced: true,
  },
  {
    key: TEAM_PERMISSIONS.EVENT_TYPE_UPDATE,
    category: "event_types",
    defaultMinimumRole: MembershipRole.ADMIN,
    enforced: true,
  },
  {
    key: TEAM_PERMISSIONS.BOOKING_CONFIRM,
    category: "bookings",
    defaultMinimumRole: MembershipRole.ADMIN,
    enforced: true,
  },
  {
    key: TEAM_PERMISSIONS.BOOKING_READ_TEAM_BOOKINGS,
    category: "bookings",
    defaultMinimumRole: MembershipRole.ADMIN,
    enforced: true,
  },
  {
    key: TEAM_PERMISSIONS.BOOKING_EDIT_LOCATION,
    category: "bookings",
    defaultMinimumRole: MembershipRole.ADMIN,
    enforced: true,
  },
  {
    key: TEAM_PERMISSIONS.BOOKING_ADD_GUESTS,
    category: "bookings",
    defaultMinimumRole: MembershipRole.ADMIN,
    enforced: true,
  },
  {
    key: TEAM_PERMISSIONS.BOOKING_REQUEST_RESCHEDULE,
    category: "bookings",
    defaultMinimumRole: MembershipRole.ADMIN,
    enforced: true,
  },
  {
    key: TEAM_PERMISSIONS.BOOKING_CANCEL,
    category: "bookings",
    defaultMinimumRole: MembershipRole.ADMIN,
    enforced: true,
  },
  {
    key: TEAM_PERMISSIONS.BOOKING_MARK_NO_SHOW,
    category: "bookings",
    defaultMinimumRole: MembershipRole.ADMIN,
    enforced: true,
  },
  {
    key: TEAM_PERMISSIONS.BOOKING_REASSIGN,
    category: "bookings",
    defaultMinimumRole: MembershipRole.ADMIN,
    enforced: false,
  },
];

export const TEAM_PERMISSION_DEFAULTS: Record<TeamPermissionKey, MembershipRole> = Object.fromEntries(
  TEAM_PERMISSION_CATALOG.map((entry) => [entry.key, entry.defaultMinimumRole])
) as Record<TeamPermissionKey, MembershipRole>;

/** Whether `actualRole` clears the `minimumRole` bar under the fixed 3-tier hierarchy. */
export function meetsMinimumRole(actualRole: MembershipRole, minimumRole: MembershipRole): boolean {
  return MEMBERSHIP_HIERARCHY[actualRole] >= MEMBERSHIP_HIERARCHY[minimumRole];
}
