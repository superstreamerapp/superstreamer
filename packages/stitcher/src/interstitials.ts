import { createUrl } from "./lib/url";
import { getAssetsFromVast } from "./vast";
import type { DateRange } from "./parser";
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
  const assets: InterstitialAsset[] = [];

  const interstitial = session.interstitials.find((interstitial) =>
    interstitial.dateTime.equals(dateTime),
  );

  if (interstitial?.vast) {
    const nextAssets = await getAssetsFromVast(interstitial.vast);
    assets.push(...nextAssets);
  }

  if (interstitial?.assets) {
    assets.push(...interstitial.assets);
  }

  return assets;
}

export function appendInterstitials(
  source: Interstitial[],
  interstitials: Interstitial[],
) {
  for (const interstitial of interstitials) {
    const target = source.find((item) =>
      item.dateTime.equals(interstitial.dateTime),
    );

    if (!target) {
      source.push(interstitial);
      continue;
    }

    if (interstitial.assets) {
      if (!target.assets) {
        target.assets = interstitial.assets;
      } else {
        target.assets.push(...interstitial.assets);
      }
    }

    if (interstitial.vast) {
      target.vast = interstitial.vast;
    }

    if (interstitial.assetList) {
      target.assetList = interstitial.assetList;
    }
  }
}

function getAssetListUrl(interstitial: Interstitial, session?: Session) {
  if (interstitial.assetList) {
    return interstitial.assetList.url;
  }
  return createUrl("out/asset-list.json", {
    dt: interstitial.dateTime.toISO(),
    sid: session?.id,
  });
}

function getTimelineStyle(interstitial: Interstitial) {
  if (interstitial.assets) {
    for (const asset of interstitial.assets) {
      if (asset.kind === "ad") {
        return "HIGHLIGHT";
      }
    }
  }

  if (interstitial.vast) {
    return "HIGHLIGHT";
  }

  return "PRIMARY";
}
