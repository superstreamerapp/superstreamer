import { Group } from "./lib/group";
import { makeUrl, resolveUri } from "./lib/url";
import { fetchDuration } from "./playlist";
import { getAdMediasFromAdBreak } from "./vast";
import { toAdBreakTimeOffset } from "./vmap";
import type { DateRange } from "./parser";
import type { Session } from "./session";
import type { AdMedia } from "./vast";
import type { VmapResponse } from "./vmap";
import type { DateTime } from "luxon";

export type InterstitialType = "ad" | "bumper";

export interface Interstitial {
  position: number;
  url: string;
  duration?: number;
  type?: InterstitialType;
}

interface InterstitialAsset {
  URI: string;
  DURATION: number;
  "SPRS-TYPE"?: InterstitialType;
}

export function getStaticDateRanges(startTime: DateTime, session: Session) {
  const group = new Group<number, InterstitialType>();

  if (session.vmapResponse) {
    for (const adBreak of session.vmapResponse.adBreaks) {
      const timeOffset = toAdBreakTimeOffset(adBreak);
      if (timeOffset !== null) {
        group.add(timeOffset, "ad");
      }
    }
  }

  if (session.interstitials) {
    for (const interstitial of session.interstitials) {
      group.add(interstitial.position, interstitial.type);
    }
  }

  const dateRanges: DateRange[] = [];

  group.forEach((timeOffset, types) => {
    const startDate = startTime.plus({ seconds: timeOffset });

    const assetListUrl = makeAssetListUrl({
      timeOffset,
      session,
    });

    const clientAttributes: Record<string, number | string> = {
      RESTRICT: "SKIP,JUMP",
      "RESUME-OFFSET": 0,
      "ASSET-LIST": assetListUrl,
      CUE: "ONCE",
    };

    if (timeOffset === 0) {
      clientAttributes["CUE"] += ",PRE";
    }

    if (types.length) {
      clientAttributes["SPRS-TYPES"] = types.join(",");
    }

    dateRanges.push({
      classId: "com.apple.hls.interstitial",
      id: `sdr${timeOffset}`,
      startDate,
      clientAttributes,
    });
  });

  return dateRanges;
}

export async function getAssets(session: Session, timeOffset?: number) {
  const assets: InterstitialAsset[] = [];

  if (timeOffset !== undefined) {
    if (session.vmapResponse) {
      const items = await getAssetsFromVmap(session.vmapResponse, timeOffset);
      assets.push(...items);
    }

    if (session.interstitials) {
      const items = await getAssetsFromGroup(session.interstitials, timeOffset);
      assets.push(...items);
    }
  }

  return assets;
}

async function getAssetsFromVmap(vmap: VmapResponse, timeOffset: number) {
  const adBreaks = vmap.adBreaks.filter(
    (adBreak) => toAdBreakTimeOffset(adBreak) === timeOffset,
  );
  const assets: InterstitialAsset[] = [];

  const adMedias: AdMedia[] = [];
  for (const adBreak of adBreaks) {
    adMedias.push(...(await getAdMediasFromAdBreak(adBreak)));
  }

  for (const adMedia of adMedias) {
    assets.push({
      URI: resolveUri(`asset://${adMedia.assetId}`),
      DURATION: adMedia.duration,
      "SPRS-TYPE": "ad",
    });
  }

  return assets;
}

async function getAssetsFromGroup(
  interstitials: Interstitial[],
  timeOffset: number,
) {
  const assets: InterstitialAsset[] = [];

  for (const interstitial of interstitials) {
    if (interstitial.position !== timeOffset) {
      continue;
    }

    let duration = interstitial.duration;
    if (!duration) {
      duration = await fetchDuration(interstitial.url);
    }

    assets.push({
      URI: interstitial.url,
      DURATION: duration,
      "SPRS-TYPE": interstitial.type,
    });
  }

  return assets;
}

function makeAssetListUrl(params: { timeOffset: number; session?: Session }) {
  return makeUrl("out/asset-list.json", {
    timeOffset: params.timeOffset,
    sid: params.session?.id,
  });
}
