import type {
  AdTrackingPodEnvelope,
  AdTrackingSlotEnvelope,
} from "./signaling";
import type { DateTime } from "luxon";

export interface InterstitialVast {
  url?: string;
  data?: string;
}

export interface InterstitialAsset {
  url: string;
  duration: number;
  kind?: "ad" | "bumper";
  tracking?: InterstitialAssetTracking;
}

export interface InterstitialAssetTracking {
  impression: string[];
  clickThrough: string[];
  [key: string]: string[];
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

export interface HlsAssetList {
  ASSETS: HlsAsset[];
  "X-AD-CREATIVE-SIGNALING"?: AdTrackingPodEnvelope;
}

export interface HlsAsset {
  URI: string;
  DURATION: number;
  "SPRS-KIND"?: "ad" | "bumper";
  "X-AD-CREATIVE-SIGNALING"?: AdTrackingSlotEnvelope;
}
