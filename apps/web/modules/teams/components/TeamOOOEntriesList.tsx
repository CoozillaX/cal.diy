"use client";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

const TeamOOOEntriesList = ({ teamId, canManage }: { teamId: number; canManage: boolean }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: entries, isPending } = trpc.viewer.teams.oooList.useQuery({ teamId });

  const deleteMutation = trpc.viewer.teams.oooDelete.useMutation({
    onSuccess: () => utils.viewer.teams.oooList.invalidate({ teamId }),
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  if (isPending) {
    return (
      <SkeletonContainer>
        <SkeletonText className="h-16 w-full" />
      </SkeletonContainer>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <EmptyScreen
        Icon="calendar-x-2"
        headline={t("no_team_time_off")}
        description={t("no_team_time_off_description")}
      />
    );
  }

  return (
    <div className="divide-y divide-subtle rounded-lg border border-subtle">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-subtle">
              <span className="text-xl">{entry.reason?.emoji || "🏢"}</span>
            </div>
            <div>
              <p className="font-medium text-emphasis">
                {dayjs(entry.start).format("D MMM YYYY")} - {dayjs(entry.end).format("D MMM YYYY")}
              </p>
              <p className="text-sm text-subtle">
                {entry.reason ? t(entry.reason.reason) : t("no_reason_given")}
                {entry.notes ? ` · ${entry.notes}` : ""}
              </p>
            </div>
          </div>
          {canManage && (
            <Button
              type="button"
              color="minimal"
              variant="icon"
              StartIcon="trash-2"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ teamId, id: entry.id })}
              aria-label={t("delete")}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default TeamOOOEntriesList;
