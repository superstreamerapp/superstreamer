import type { DateTime } from "luxon";

export type Interstitial = {
  dateTime: DateTime;
} & (
  | {
      type: "asset";
      url: string;
    }
  | {
      type: "vast";
      url?: string;
      data?: string;
    }
  | {
      type: "assetList";
      url: string;
    }
);
