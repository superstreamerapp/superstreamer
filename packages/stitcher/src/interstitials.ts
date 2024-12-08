import { createUrl } from "./lib/url";
import { fetchDuration } from "./playlist";
import { getAdMediasFromVast } from "./vast";
import type { Session } from "./session";
import type { DateTime } from "luxon";

export function getStaticDateRanges(session: Session, isLive: boolean) {
  const group: {
    dateTime: DateTime;
  }[] = [];

  for (const interstitial of session.interstitials) {
    let item = group.find((item) =>
      item.dateTime.equals(interstitial.dateTime),
    );

    if (!item) {
      item = {
        dateTime: interstitial.dateTime,
      };
      group.push(item);
    }
  }

  return group.map((item) => {
    const assetListUrl = createAssetListUrl({
      dateTime: item.dateTime,
      session,
    });

    const clientAttributes: Record<string, number | string> = {
      RESTRICT: "SKIP,JUMP",
      "ASSET-LIST": assetListUrl,
      CUE: "ONCE",
    };

    if (!isLive) {
      clientAttributes["RESUME-OFFSET"] = 0;
    }

    const isPreroll = item.dateTime.equals(session.startTime);
    if (isPreroll) {
      clientAttributes["CUE"] += ",PRE";
    }

    return {
      classId: "com.apple.hls.interstitial",
      id: `${item.dateTime.toUnixInteger()}`,
      startDate: item.dateTime,
      clientAttributes,
    };
  });
}

export async function getAssets(session: Session, dateTime: DateTime) {
  const assets: {
    URI: string;
    DURATION: number;
  }[] = [];

  const interstitials = session.interstitials.filter((interstitial) =>
    interstitial.dateTime.equals(dateTime),
  );

  for (const interstitial of interstitials) {
    if (interstitial.type === "vast") {
      const adMedias = await getAdMediasFromVast(interstitial);
      for (const adMedia of adMedias) {
        assets.push({
          URI: adMedia.masterUrl,
          DURATION: adMedia.duration,
        });
      }
    }

    if (interstitial.type === "asset") {
      assets.push({
        URI: interstitial.url,
        DURATION: await fetchDuration(interstitial.url),
      });
    }
  }

  return assets;
}

function createAssetListUrl(params: { dateTime: DateTime; session?: Session }) {
  return createUrl("out/asset-list.json", {
    dt: params.dateTime.toISO(),
    sid: params.session?.id,
  });
}
