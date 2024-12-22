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

export type InterstitialChunk =
  | { type: "asset"; data: InterstitialAsset }
  | { type: "vast"; data: InterstitialVast }
  | { type: "assetList"; data: InterstitialAssetList };

export interface Interstitial {
  dateTime: DateTime;
  duration?: number;
  chunks: InterstitialChunk[];
}
