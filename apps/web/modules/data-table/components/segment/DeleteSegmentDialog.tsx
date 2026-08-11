import type { FilterSegmentOutput } from "@calcom/features/data-table/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { useDataTable } from "~/data-table/hooks";

export function DeleteSegmentDialog({
  segment,
  onClose,
}: {
  segment: FilterSegmentOutput;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { tableIdentifier, segmentId, setSegmentId } = useDataTable();

  const deleteSegment = trpc.viewer.filterSegments.delete.useMutation({
    onSuccess: () => {
      utils.viewer.filterSegments.list.invalidate({ tableIdentifier });
      // The segment being deleted might be the one currently applied - clear it so the
      // table doesn't keep filtering by a segment that no longer exists.
      if (segmentId && segmentId.type === "user" && segmentId.id === segment.id) {
        setSegmentId(null);
      }
      showToast(t("filter_segment_deleted"), "success");
      onClose();
    },
    onError: (err) => showToast(err.message || t("error_deleting_filter_segment"), "error"),
  });
  const isPending = deleteSegment.isPending;

  const handleDelete = () => {
    if (!segment) return;
    deleteSegment.mutate({ id: segment.id });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}>
      <ConfirmationDialogContent
        variety="danger"
        title={t("delete_segment")}
        confirmBtnText={t("delete")}
        cancelBtnText={t("cancel")}
        isPending={isPending}
        onConfirm={handleDelete}>
        <p className="mt-5">{t("delete_segment_confirmation")}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}
