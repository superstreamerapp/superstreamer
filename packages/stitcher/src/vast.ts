import { DOMParser } from "@xmldom/xmldom";
import * as uuid from "uuid";
import { VASTClient } from "vast-client";
import { api } from "./lib/api-client";
import { resolveUri } from "./lib/url";
import type { VastAd, VastCreativeLinear, VastResponse } from "vast-client";

const NAMESPACE_UUID_AD = "5b212a7e-d6a2-43bf-bd30-13b1ca1f9b13";

export interface AdMedia {
  masterUrl: string;
  duration: number;
}

export async function getAdMediasFromVast(params: {
  vastUrl?: string;
  vastData?: string;
}) {
  const vastClient = new VASTClient();
  let vastResponse: VastResponse | undefined;

  if (params.vastUrl) {
    vastResponse = await vastClient.get(params.vastUrl);
  }

  if (params.vastData) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(params.vastData, "text/xml");
    vastResponse = await vastClient.parseVAST(xml);
  }

  if (!vastResponse) {
    return [];
  }

  return await getAdMediasFromVastResponse(vastResponse);
}

async function scheduleForPackage(assetId: string, url: string) {
  if (!api) {
    // API is not configured, we cannot schedule for packaging.
    return;
  }

  await api.pipeline.post({
    assetId,
    group: "ad",
    inputs: [
      {
        path: url,
        type: "video",
      },
      {
        path: url,
        type: "audio",
        language: "eng",
      },
    ],
    streams: [
      {
        type: "video",
        codec: "h264",
        height: 720,
      },
      {
        type: "video",
        codec: "h264",
        height: 480,
      },
      {
        type: "audio",
        codec: "aac",
        language: "eng",
      },
    ],
  });
}

async function fetchAsset(id: string) {
  if (!api) {
    // If we have no api configured, we cannot use it.
    return null;
  }
  const { data, status } = await api.assets({ id }).get();
  if (status === 404) {
    return null;
  }
  if (status === 200) {
    return data;
  }
  throw new Error(`Failed to fetch asset, got status ${status}`);
}

async function mapAdMedia(ad: VastAd): Promise<AdMedia | null> {
  const creative = getCreative(ad);
  if (!creative) {
    return null;
  }

  const id = getAdId(creative);

  let masterUrl = getCreativeStreamingUrl(creative);

  if (!masterUrl) {
    const asset = await fetchAsset(id);

    if (asset) {
      masterUrl = resolveUri(`asset://${id}`);
    } else {
      const fileUrl = getCreativeStaticUrl(creative);
      if (fileUrl) {
        await scheduleForPackage(id, fileUrl);
      }
    }
  }

  if (!masterUrl) {
    return null;
  }

  return {
    masterUrl,
    duration: creative.duration,
  };
}

async function getAdMediasFromVastResponse(response: VastResponse) {
  const adMedias: AdMedia[] = [];

  for (const ad of response.ads) {
    const adMedia = await mapAdMedia(ad);
    if (!adMedia) {
      continue;
    }
    adMedias.push(adMedia);
  }

  return adMedias;
}

function getCreativeStaticUrl(creative: VastCreativeLinear) {
  let fileUrl: string | null = null;
  let lastHeight = 0;

  for (const mediaFile of creative.mediaFiles) {
    if (mediaFile.mimeType === "video/mp4" && mediaFile.height > lastHeight) {
      lastHeight = mediaFile.height;
      fileUrl = mediaFile.fileURL;
    }
  }

  return fileUrl;
}

function getCreativeStreamingUrl(creative: VastCreativeLinear) {
  for (const mediaFile of creative.mediaFiles) {
    if (mediaFile.mimeType === "application/x-mpegURL") {
      return mediaFile.fileURL;
    }
  }
  return null;
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
