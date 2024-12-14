import type { DateTime } from "luxon";

export interface InterstitialVast {
  url?: string;
  data?: string;
}

export interface InterstitialAsset {
  url: string;
  duration?: number;
  kind?: "ad" | "bumper";
  tracking?: Record<string, string[]>;
}

export interface InterstitialAssetList {
  url: string;
}

export interface Interstitial {
  dateTime: DateTime;
  duration?: number;
  assets?: InterstitialAsset[];
  vast?: InterstitialVast;
  assetList?: InterstitialAssetList;
}
