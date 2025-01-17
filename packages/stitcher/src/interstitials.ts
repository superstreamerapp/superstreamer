import { createUrl } from "./lib/url";
import { getAssetsFromVast } from "./vast";
import type { CueOut, DateRange, MediaPlaylist } from "./parser";
import type { Session } from "./session";
import type { Interstitial, InterstitialAsset } from "./types";
import type { DateTime } from "luxon";

export function getStaticDateRanges(session: Session, isLive: boolean) {
  return session.interstitials.map<DateRange>((interstitial) => {
    const startDate = interstitial.dateTime;
    const assetListUrl = getAssetListUrl(interstitial, session);

    const clientAttributes: Record<string, number | string> = {
      RESTRICT: "SKIP,JUMP",
      "ASSET-LIST": assetListUrl,
      "CONTENT-MAY-VARY": "YES",
      "TIMELINE-OCCUPIES": "POINT",
      "TIMELINE-STYLE": getTimelineStyle(interstitial),
    };

    if (!isLive) {
      clientAttributes["RESUME-OFFSET"] = 0;
    }

    if (interstitial.duration) {
      clientAttributes["PLAYOUT-LIMIT"] = interstitial.duration;
    }

    const cue: string[] = ["ONCE"];
    if (startDate.equals(session.startTime)) {
      cue.push("PRE");
    }

    if (cue.length) {
      clientAttributes["CUE"] = cue.join(",");
    }

    return {
      classId: "com.apple.hls.interstitial",
      id: `${startDate.toMillis()}`,
      startDate,
      clientAttributes,
    };
  });
}

export async function getAssets(session: Session, dateTime: DateTime) {
  const interstitial = session.interstitials.find((interstitial) =>
    interstitial.dateTime.equals(dateTime),
  );

  if (!interstitial) {
    return [];
  }

  const assets: InterstitialAsset[] = [];

  for (const chunk of interstitial.chunks) {
    if (chunk.type === "vast") {
      const nextAssets = await getAssetsFromVast(chunk.data);
      assets.push(...nextAssets);
    }
    if (chunk.type === "asset") {
      assets.push(chunk.data);
    }
  }

  return assets;
}

export function mergeInterstitials(
  source: Interstitial[],
  interstitials: Interstitial[],
) {
  for (const interstitial of interstitials) {
    const target = source.find((item) =>
      item.dateTime.equals(interstitial.dateTime),
    );

    if (!target) {
      source.push(interstitial);
    } else {
      // If we found a source for the particular dateTime, we push the
      // other chunks at the end.
      target.chunks.push(...interstitial.chunks);
    }
  }
}

function getAssetListUrl(interstitial: Interstitial, session?: Session) {
  const assetListChunks = interstitial.chunks.filter(
    (chunk) => chunk.type === "assetList",
  );
  if (assetListChunks.length === 1 && assetListChunks[0]) {
    return assetListChunks[0].data.url;
  }

  return createUrl("out/asset-list.json", {
    dt: interstitial.dateTime.toISO(),
    sid: session?.id,
  });
}

function getTimelineStyle(interstitial: Interstitial) {
  for (const chunk of interstitial.chunks) {
    if (chunk.type === "asset" && chunk.data.kind === "ad") {
      return "HIGHLIGHT";
    }
    if (chunk.type === "vast") {
      return "HIGHLIGHT";
    }
  }
  return "PRIMARY";
}

export function insertInterstitialsFromCuesMap(
  cuesMap: {
    dateTime: DateTime;
    cueOut: CueOut;
  }[],
  media: MediaPlaylist,
) {
  for (const item of cuesMap) {
    const clientAttributes: Record<string, number | string> = {
      RESTRICT: "SKIP,JUMP",
      "ASSET-LIST": createUrl("out/asset-list.json", {
        dt: item.dateTime.toISO(),
        sid: "live",
      }),
      // "PLAYOUT-LIMIT": item.cueOut.duration,
    };

    media.dateRanges.push({
      classId: "com.apple.hls.interstitial",
      id: `${item.dateTime.toMillis()}`,
      startDate: item.dateTime.minus({ milliseconds: 1 }),
      clientAttributes,
    });
  }
}
