import { z } from "zod";

export const ZListPaginatedInputSchema = z.object({
  limit: z.number().min(1).max(100),
  cursor: z.number().nullish(),
  searchTerm: z.string().nullish(),
});

export type TListPaginatedInputSchema = z.infer<typeof ZListPaginatedInputSchema>;
