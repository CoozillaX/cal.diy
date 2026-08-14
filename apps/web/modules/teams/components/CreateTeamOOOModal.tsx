"use client";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { DateRangePicker, Select, TextArea } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Controller, useForm } from "react-hook-form";

type FormValues = {
  dateRange: { startDate: Date; endDate: Date | null };
  reasonId: number | null;
  notes: string;
};

type ReasonOption = { value: number; label: string };

/** `asAdmin`: platform admin managing any team from /settings/admin/teams, not a member of it -
 * see agents/rules/architecture-page-level-auth.md. */
const CreateTeamOOOModal = ({
  teamId,
  open,
  onOpenChange,
  asAdmin = false,
}: {
  teamId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asAdmin?: boolean;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: reasonList } = trpc.viewer.ooo.outOfOfficeReasonList.useQuery();
  const reasonOptions: ReasonOption[] = (reasonList || []).map((reason) => ({
    value: reason.id,
    label: `${reason.emoji} ${reason.userId === null ? t(reason.reason) : reason.reason}`,
  }));

  const { handleSubmit, control, register, reset } = useForm<FormValues>({
    defaultValues: {
      dateRange: {
        startDate: dayjs().startOf("day").toDate(),
        endDate: dayjs().startOf("day").add(2, "day").toDate(),
      },
      reasonId: null,
      notes: "",
    },
  });

  const onCreateSuccess = async () => {
    await Promise.all([
      utils.viewer.teams.oooList.invalidate({ teamId }),
      utils.viewer.admin.teams.oooList.invalidate({ teamId }),
    ]);
    showToast(t("team_time_off_created"), "success");
    reset();
    onOpenChange(false);
  };

  const createMutation = trpc.viewer.teams.oooCreate.useMutation({
    onSuccess: onCreateSuccess,
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  const adminCreateMutation = trpc.viewer.admin.teams.oooCreate.useMutation({
    onSuccess: onCreateSuccess,
    onError: (err) => showToast(err.message || t("something_went_wrong"), "error"),
  });

  const activeCreateMutation = asAdmin ? adminCreateMutation : createMutation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent enableOverflow>
        <DialogHeader title={t("add_team_time_off")} subtitle={t("add_team_time_off_description")} />
        <form
          id="create-team-ooo-form"
          onSubmit={handleSubmit((values) => {
            if (!values.dateRange.endDate) {
              showToast(t("end_date_not_selected"), "error");
              return;
            }
            activeCreateMutation.mutate({
              teamId,
              start: values.dateRange.startDate,
              end: values.dateRange.endDate,
              notes: values.notes || null,
              reasonId: values.reasonId,
            });
          })}>
          <div>
            <p className="mb-1 block font-medium text-emphasis text-sm">{t("dates")}</p>
            <Controller
              name="dateRange"
              control={control}
              render={({ field: { onChange, value } }) => (
                <DateRangePicker
                  minDate={null}
                  dates={{ startDate: value.startDate, endDate: value.endDate ?? undefined }}
                  onDatesChange={onChange}
                  strictlyBottom
                  allowPastDates
                />
              )}
            />
          </div>

          <div className="mt-4">
            <p className="block font-medium text-emphasis text-sm">{t("reason")}</p>
            <Controller
              control={control}
              name="reasonId"
              render={({ field: { onChange, value } }) => (
                <Select<ReasonOption>
                  className="mt-1"
                  menuPlacement="bottom"
                  value={reasonOptions.find((reason) => reason.value === value)}
                  placeholder={t("ooo_select_reason")}
                  options={reasonOptions}
                  onChange={(option) => onChange(option?.value ?? null)}
                />
              )}
            />
          </div>

          <div className="mt-4">
            <p className="font-medium text-emphasis text-sm">{t("notes")}</p>
            <TextArea
              className="mt-2 h-20 w-full rounded-lg border border-subtle px-2"
              placeholder={t("team_time_off_notes_placeholder")}
              {...register("notes")}
            />
          </div>

          <DialogFooter showDivider>
            <Button type="button" color="minimal" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button form="create-team-ooo-form" type="submit" loading={activeCreateMutation.isPending}>
              {t("add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamOOOModal;
