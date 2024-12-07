import type { DateTime } from "luxon";

export type InterstitialAssetType = "ad" | "bumper";

export interface InterstitialAsset {
  url: string;
  type?: InterstitialAssetType;
}

export interface Interstitial {
  dateTime: DateTime;
  vastUrl?: string;
  vastData?: string;
  asset?: InterstitialAsset;
  assetListUrl?: string;
}
