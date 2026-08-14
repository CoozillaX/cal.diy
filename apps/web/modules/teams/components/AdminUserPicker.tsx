"use client";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui/components/form";
import { useMemo, useState } from "react";
import type { CSSObjectWithLabel } from "react-select";

export type UserOption = { value: number; label: string };

/** Debounced user search, used to pick an existing user as a team owner or member to add -
 * reused across the admin team create/edit views. */
export const AdminUserPicker = ({
  value,
  onChange,
  isDisabled,
}: {
  value: UserOption | null;
  onChange: (option: UserOption | null) => void;
  isDisabled?: boolean;
}) => {
  const { t } = useLocale();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data, isFetching } = trpc.viewer.admin.listPaginated.useQuery({
    limit: 20,
    searchTerm: debouncedSearchTerm,
  });

  const options: UserOption[] = useMemo(
    () => (data?.rows ?? []).map((user) => ({ value: user.id, label: `${user.name} (${user.email})` })),
    [data]
  );

  return (
    <Select<UserOption>
      isDisabled={isDisabled}
      value={value}
      options={options}
      isLoading={isFetching}
      onInputChange={(input) => setSearchTerm(input)}
      onChange={onChange}
      placeholder={t("search_users_placeholder")}
      noOptionsMessage={() => t("no_results")}
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      menuPlacement="auto"
      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) as CSSObjectWithLabel }}
    />
  );
};
