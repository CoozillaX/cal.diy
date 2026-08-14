"use client";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Form, Label, TextField } from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { Controller, useForm } from "react-hook-form";
import type { UserOption } from "./AdminUserPicker";
import { AdminUserPicker } from "./AdminUserPicker";

export type AdminTeamFormValues = {
  name: string;
  slug: string;
  logoUrl: string | null;
  bio: string;
  owner: UserOption | null;
};

/** Shared by the admin create-team and edit-team views. `requireOwner` renders the owner picker -
 * only relevant on create, since every team must have an owner from the moment it exists
 * (see TeamRepository.createWithOwner). Editing an existing team's ownership happens via its
 * members list instead (promote/demote role), not by re-submitting this form. */
export const AdminTeamForm = ({
  defaultValues,
  requireOwner = false,
  submitLabel = "save",
  isSubmitting,
  onSubmit,
}: {
  defaultValues?: Partial<AdminTeamFormValues>;
  requireOwner?: boolean;
  submitLabel?: string;
  isSubmitting?: boolean;
  onSubmit: (values: AdminTeamFormValues) => void;
}) => {
  const { t } = useLocale();
  const form = useForm<AdminTeamFormValues>({
    defaultValues: {
      name: defaultValues?.name ?? "",
      slug: defaultValues?.slug ?? "",
      logoUrl: defaultValues?.logoUrl ?? null,
      bio: defaultValues?.bio ?? "",
      owner: defaultValues?.owner ?? null,
    },
  });

  return (
    <Form form={form} className="stack-y-4" handleSubmit={onSubmit}>
      <Controller
        control={form.control}
        name="logoUrl"
        render={({ field: { value, onChange } }) => (
          <div className="flex items-center">
            <Avatar
              alt={form.watch("name")}
              imageSrc={getPlaceholderAvatar(value, form.watch("name"))}
              size="lg"
            />
            <div className="ml-4">
              <ImageUploader
                target={t("team_logo")}
                id="admin-team-logo-upload"
                buttonMsg={t("upload_logo")}
                handleAvatarChange={onChange}
                imageSrc={getPlaceholderAvatar(value, form.watch("name"))}
              />
            </div>
          </div>
        )}
      />
      <TextField label={t("team_name")} required {...form.register("name", { required: true })} />
      <TextField label={t("team_url")} required {...form.register("slug", { required: true })} />
      <TextField label={t("about")} {...form.register("bio")} />
      {requireOwner && (
        <Controller
          control={form.control}
          name="owner"
          rules={{ required: true }}
          render={({ field: { value, onChange } }) => (
            <div>
              <Label className="font-medium text-default">{t("team_owner")}</Label>
              <AdminUserPicker value={value} onChange={onChange} />
            </div>
          )}
        />
      )}
      <Button type="submit" loading={isSubmitting}>
        {t(submitLabel)}
      </Button>
    </Form>
  );
};
