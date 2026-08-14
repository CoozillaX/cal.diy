"use client";

import { AdminTeamMembers } from "../components/AdminTeamMembers";

export default function AdminTeamsMembersView({ teamId }: { teamId: number }) {
  return <AdminTeamMembers teamId={teamId} />;
}
