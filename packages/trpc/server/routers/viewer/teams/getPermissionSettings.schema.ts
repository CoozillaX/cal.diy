import { z } from "zod";

export const ZGetPermissionSettingsInputSchema = z.object({
  teamId: z.number(),
});

export type TGetPermissionSettingsInputSchema = z.infer<typeof ZGetPermissionSettingsInputSchema>;
