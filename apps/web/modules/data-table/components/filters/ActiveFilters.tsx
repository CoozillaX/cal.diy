"use client";

import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import type { Table } from "@tanstack/react-table";
import { useDataTable, useFilterableColumns } from "~/data-table/hooks";
import { DateRangeFilter } from "./DateRangeFilter";
import { FilterPopover } from "./FilterPopover";

// Add the new ActiveFilters component
interface ActiveFiltersProps<TData> {
  table: Table<TData>;
  columnIdsToHide?: string[];
}

export function ActiveFilters<TData>({ table, columnIdsToHide }: ActiveFiltersProps<TData>) {
  const { activeFilters } = useDataTable();
  const filterableColumns = useFilterableColumns(table);

  // Defensive dedupe by column id: a URL/segment saved before the addFilter
  // race fix below could still carry two entries for the same filter, which
  // would render two elements with the same `key`.
  const seenColumnIds = new Set<string>();

  return (
    <>
      {activeFilters.map((filter) => {
        const column = filterableColumns.find((col) => col.id === filter.f);
        if (!column) {
          return null;
        }
        if (seenColumnIds.has(column.id)) {
          return null;
        }
        seenColumnIds.add(column.id);
        if (columnIdsToHide?.includes(column.id)) {
          return null;
        }

        if (column.type === ColumnFilterType.DATE_RANGE) {
          return (
            <DateRangeFilter
              key={column.id}
              column={column}
              options={column.dateRangeOptions}
              showColumnName
              showClearButton
            />
          );
        } else {
          return <FilterPopover key={column.id} column={column} />;
        }
      })}
    </>
  );
}
