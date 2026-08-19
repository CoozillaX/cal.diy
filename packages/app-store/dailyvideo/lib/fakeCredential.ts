import process from "node:process";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

// Split from VideoApiAdapter.ts so consumers that only need this constant
// don't force a static import of the adapter, which otherwise defeats the
// dynamic import used by video.adapters.generated.ts (see Vite/Rollup
// "will not move module into another chunk" warning).
/** @deprecated use metadata on index file */
export const FAKE_DAILY_CREDENTIAL: CredentialForCalendarService & { invalid: boolean } = {
  id: 0,
  type: "daily_video",
  key: { apikey: process.env.DAILY_API_KEY },
  userId: 0,
  user: { email: "" },
  appId: "daily-video",
  invalid: false,
  teamId: null,
  encryptedKey: null,
  delegatedToId: null,
  delegatedTo: null,
  delegationCredentialId: null,
};
