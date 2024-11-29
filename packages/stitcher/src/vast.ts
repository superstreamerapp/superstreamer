import { DOMParser } from "@xmldom/xmldom";
import { AudioCodec, VideoCodec } from "bolt";
import * as uuid from "uuid";
import { VASTClient } from "vast-client";
import { api } from "./lib/api-client";
import type { VmapAdBreak } from "./vmap";
import type { VastAd, VastCreativeLinear, VastResponse } from "vast-client";

const NAMESPACE_UUID_AD = "5b212a7e-d6a2-43bf-bd30-13b1ca1f9b13";

export interface AdSlotImpression {
  type: "impression" | "clickthrough" | "quartile";
  start?: number;
  urls: string[];
}

export interface AdSlot {
  id: string;
  fileUrl: string;
  duration: number;
  impressions: AdSlotImpression[];
}

export async function extractPlayableAdSlots(adBreak: VmapAdBreak) {
  const adSlots = await getAdSlots(adBreak);
  const result: AdSlot[] = [];

  for (const adSlot of adSlots) {
    const asset = await fetchAsset(adSlot.id);
    if (!asset) {
      await scheduleForPackage(adSlot);
    } else {
      // If we have an asset registered for the ad media,
      // add it to the result.
      result.push(adSlot);
    }
  }

  return result;
}

async function getAdSlots(adBreak: VmapAdBreak): Promise<AdSlot[]> {
  const vastClient = new VASTClient();
  const parser = new DOMParser();

  let vastResponse: VastResponse | undefined;

  if (adBreak.vastUrl) {
    vastResponse = await vastClient.get(adBreak.vastUrl);
  } else if (adBreak.vastData) {
    const xml = parser.parseFromString(adBreak.vastData, "text/xml");
    vastResponse = await vastClient.parseVAST(xml);
  }

  if (!vastResponse) {
    return [];
  }

  return await formatVastResponse(vastResponse);
}

async function scheduleForPackage(adSlot: AdSlot) {
  await api.pipeline.post({
    assetId: adSlot.id,
    group: "ad",
    inputs: [
      {
        path: adSlot.fileUrl,
        type: "video",
      },
      {
        path: adSlot.fileUrl,
        type: "audio",
        language: "eng",
      },
    ],
    streams: [
      {
        type: "video",
        codec: VideoCodec.h264,
        height: 720,
      },
      {
        type: "video",
        codec: VideoCodec.h264,
        height: 480,
      },
      {
        type: "audio",
        codec: AudioCodec.aac,
        language: "eng",
      },
    ],
  });
}

async function fetchAsset(id: string) {
  const { data, status } = await api.assets({ id }).get();
  if (status === 404) {
    return null;
  }
  if (status === 200) {
    return data;
  }
  throw new Error(`Failed to fetch asset, got status ${status}`);
}

async function formatVastResponse(response: VastResponse) {
  return response.ads.reduce<AdSlot[]>((acc, ad) => {
    const creative = getCreative(ad);
    if (!creative) {
      return acc;
    }

    const mediaFile = getMediaFile(creative);
    if (!mediaFile?.fileURL) {
      return acc;
    }

    acc.push({
      id: getAdId(creative),
      fileUrl: mediaFile.fileURL,
      duration: creative.duration,
      impressions: getImpressions(creative),
    });

    return acc;
  }, []);
}

function getMediaFile(creative: VastCreativeLinear) {
  const mediaFiles = creative.mediaFiles
    .filter((mediaFile) => mediaFile.mimeType === "video/mp4")
    .sort((a, b) => b.height - a.height);
  return mediaFiles[0] ?? null;
}

function getCreative(ad: VastAd) {
  for (const creative of ad.creatives) {
    if (creative.type === "linear") {
      return creative as VastCreativeLinear;
    }
  }
  return null;
}

function getAdId(creative: VastCreativeLinear) {
  if (creative.adId && creative.id) {
    // Do not change this, or we'll have a mismatch between the already encoded ad's and the other.
    // See https://iabtechlab.com/guidance-for-uniquely-identifying-creative-asset-ids-in-vast-2/
    const adId = [creative.adId, creative.id].join(".");
    return uuid.v5(adId, NAMESPACE_UUID_AD);
  }

  throw new Error("Failed to generate adId");
}

function getImpressions(creative: VastCreativeLinear) {
  const result: AdSlotImpression[] = [];

  result.push(
    {
      type: "quartile",
      start: creative.duration * 0.25,
      urls: creative.trackingEvents.firstQuartile,
    },
    {
      type: "quartile",
      start: creative.duration * 0.5,
      urls: creative.trackingEvents.midpoint,
    },
    {
      type: "quartile",
      start: creative.duration * 0.75,
      urls: creative.trackingEvents.thirdQuartile,
    },
    {
      type: "quartile",
      start: creative.duration,
      urls: creative.trackingEvents.complete,
    },
  );

  if (creative.trackingEvents["start"]) {
    result.push({
      type: "impression",
      start: 0,
      urls: creative.trackingEvents["start"],
    });
  }

  return result;
}
