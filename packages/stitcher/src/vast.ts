import { DOMParser } from "@xmldom/xmldom";
import { AudioCodec, VideoCodec } from "bolt";
import * as uuid from "uuid";
import { VASTClient } from "vast-client";
import { api } from "./lib/api-client";
import type { VmapAdBreak } from "./vmap";
import type { VastAd, VastCreativeLinear, VastResponse } from "vast-client";

const NAMESPACE_UUID_AD = "5b212a7e-d6a2-43bf-bd30-13b1ca1f9b13";

export interface AdMedia {
  assetId: string;
  fileUrl: string;
  duration: number;
}

export async function getAdMediasFromAdBreak(adBreak: VmapAdBreak) {
  const adMedias = await getAdMedias(adBreak);
  const result: AdMedia[] = [];

  for (const adMedia of adMedias) {
    const asset = await fetchAsset(adMedia.assetId);
    if (!asset) {
      await scheduleForPackage(adMedia);
    } else {
      // If we have an asset registered for the ad media,
      // add it to the result.
      result.push(adMedia);
    }
  }

  return result;
}

async function getAdMedias(adBreak: VmapAdBreak): Promise<AdMedia[]> {
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

async function scheduleForPackage(adMedia: AdMedia) {
  await api.pipeline.post({
    assetId: adMedia.assetId,
    group: "ad",
    inputs: [
      {
        path: adMedia.fileUrl,
        type: "video",
      },
      {
        path: adMedia.fileUrl,
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
  return response.ads.reduce<AdMedia[]>((acc, ad) => {
    const creative = getCreative(ad);
    if (!creative) {
      return acc;
    }

    const mediaFile = getMediaFile(creative);
    if (!mediaFile?.fileURL) {
      return acc;
    }

    const adId = getAdId(creative);

    acc.push({
      assetId: adId,
      fileUrl: mediaFile.fileURL,
      duration: creative.duration,
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
