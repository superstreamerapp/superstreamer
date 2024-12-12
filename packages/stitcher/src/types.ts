import type { DateTime } from "luxon";

export interface InterstitialVast {
  url?: string;
  data?: string;
}

export interface InterstitialAsset {
  url: string;
  duration?: number;
  kind?: "ad" | "bumper";
}

export interface InterstitialAssetList {
  url: string;
}

export interface Interstitial {
  dateTime: DateTime;
  assets?: InterstitialAsset[];
  vast?: InterstitialVast;
  assetList?: InterstitialAssetList;
}
