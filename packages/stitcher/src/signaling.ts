import type { InterstitialAsset } from "./types";

// The types below define the SVTA Ad Signaling Spec version 2,
// if we make changes here, we should make them in @superstreamer/player too.
// We consume these events in the player to fire beacons per pod.

interface AdTrackingEvent {
  type: "impression" | "quartile" | "clickthrough" | "podstart" | "podend";
  start?: number;
  urls: string[];
}

interface AdTrackingSlot {
  type: "linear";
  start: number;
  duration: number;
  tracking: AdTrackingEvent[];
}

interface AdTrackingPod {
  start: number;
  duration: number;
  tracking: AdTrackingEvent[];
}

export interface AdTrackingPodEnvelope {
  version: 2;
  type: "pod";
  payload: AdTrackingPod[];
}

export interface AdTrackingSlotEnvelope {
  version: 2;
  type: "slot";
  payload: AdTrackingSlot[];
}

export function getSlotSignaling(
  assets: InterstitialAsset[],
  asset: InterstitialAsset,
): AdTrackingSlotEnvelope | null {
  const startTime = getAssetStartTime(assets, asset);

  const slot = mapAssetToSlot(asset, startTime);
  if (!slot) {
    return null;
  }

  return {
    version: 2,
    type: "slot",
    payload: [slot],
  };
}

export function getPodSignaling(
  assets: InterstitialAsset[],
  start: number,
): AdTrackingPodEnvelope {
  const duration = assets.reduce((acc, asset) => {
    acc += asset.duration;
    return acc;
  }, 0);

  return {
    version: 2,
    type: "pod",
    payload: [
      {
        start,
        duration,
        tracking: [],
      },
    ],
  };
}

const QUARTILE_EVENTS: Record<string, number> = {
  start: 0,
  firstQuartile: 0.25,
  midpoint: 0.5,
  thirdQuartile: 0.75,
  complete: 1,
};

function mapAssetToSlot(
  asset: InterstitialAsset,
  start: number,
): AdTrackingSlot | null {
  if (!asset.tracking) {
    return null;
  }

  const events: AdTrackingEvent[] = [
    {
      type: "impression",
      start: 0,
      urls: asset.tracking.impression,
    },
    {
      type: "clickthrough",
      urls: asset.tracking.clickThrough,
    },
  ];

  // Map each tracking URL to their corresponding quartile.
  Object.entries(asset.tracking).forEach(([name, urls]) => {
    const offset = QUARTILE_EVENTS[name];
    if (offset !== undefined) {
      events.push({
        type: "quartile",
        start: asset.duration * offset,
        urls,
      });
    }
  });

  return {
    type: "linear",
    start,
    duration: asset.duration,
    tracking: events,
  };
}

function getAssetStartTime(
  assets: InterstitialAsset[],
  target: InterstitialAsset,
) {
  let startTime = 0;
  for (const asset of assets) {
    if (asset === target) {
      break;
    }
    startTime += asset.duration;
  }
  return startTime;
}
