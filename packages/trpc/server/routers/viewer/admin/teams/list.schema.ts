import { z } from "zod";

export const ZAdminListTeamsInputSchema = z.object({
  limit: z.number().min(1).max(100),
  cursor: z.number().nullish(),
  searchTerm: z.string().nullish(),
});

export type TAdminListTeamsInputSchema = z.infer<typeof ZAdminListTeamsInputSchema>;
