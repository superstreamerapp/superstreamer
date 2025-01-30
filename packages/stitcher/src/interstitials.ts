import { DateTime } from "luxon";
import { HashGroup } from "./lib/hash-group";
import { createUrl, replaceUrlParams } from "./lib/url";
import { getAssetsFromVastData, getAssetsFromVastUrl } from "./vast";
import type { DateRange, Segment } from "./parser";
import type { Session } from "./session";
import type { Asset } from "./types";

// An item describes what we'd like to collect for a particular date.
interface DateGroupItem {
  timelineStyle: "HIGHLIGHT" | "PRIMARY";
  replaceContent: boolean;
  maxDuration?: number;
}

export function getStaticDateRanges(
  session: Session,
  segments: Segment[],
  isLive: boolean,
) {
  const dateGroup = new HashGroup<number, DateGroupItem>({
    getDefaultValue: () => ({
      timelineStyle: "PRIMARY",
      replaceContent: isLive ? true : false,
    }),
  });

  // Collect dateRanges from splice points.
  for (const segment of segments) {
    if (segment.spliceInfo?.type !== "OUT" || !segment.programDateTime) {
      continue;
    }

    const key = segment.programDateTime.toMillis();
    const item = dateGroup.get(key);

    item.timelineStyle = "HIGHLIGHT";
    item.maxDuration = segment.spliceInfo.duration;
  }

  // Collect dateRanges from each event defined in the session.
  for (const event of session.events) {
    const key = event.dateTime.toMillis();
    const item = dateGroup.get(key);

    if (event.vast) {
      // If we resolved the event by a vast, we know it's an ad and can mark it
      // as HIGHLIGHT on the timeline.
      item.timelineStyle = "HIGHLIGHT";
    }

    if (
      !event.maxDuration ||
      (item.maxDuration && event.maxDuration > item.maxDuration)
    ) {
      // If we have a max duration for this event, we'll save it for this interstitial. Always takes the
      // largest maxDuration across events.
      item.maxDuration = event.maxDuration;
    }
  }

  return dateGroup.toEntries().map<DateRange>(([key, item]) => {
    const startDate = DateTime.fromMillis(key);

    const assetListUrl = createUrl("out/asset-list.json", {
      dt: startDate.toISO(),
      sid: session.id,
      mdur: item.maxDuration,
    });

    const clientAttributes: Record<string, number | string> = {
      RESTRICT: "SKIP,JUMP",
      "ASSET-LIST": assetListUrl,
      "CONTENT-MAY-VARY": "YES",
      "TIMELINE-OCCUPIES": "POINT",
      "TIMELINE-STYLE": item.timelineStyle,
    };

    if (!item.replaceContent) {
      clientAttributes["RESUME-OFFSET"] = 0;
    }

    if (item.maxDuration !== undefined) {
      clientAttributes["PLAYOUT-LIMIT"] = item.maxDuration;
    }

    const cue: string[] = [];
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

export async function getAssets(
  session: Session,
  dateTime: DateTime,
  maxDuration?: number,
): Promise<Asset[]> {
  // Filter all events for a particular dateTime, we'll need to transform these to
  // a list of assets.
  const events = session.events.filter((event) =>
    event.dateTime.equals(dateTime),
  );

  const assets: Asset[] = [];

  for (const event of events) {
    if (event.vast) {
      const { url, data } = event.vast;

      // The event contains a VAST url.
      if (url) {
        const vastUrl = replaceUrlParams(url, {
          maxDuration,
        });
        const vastAssets = await getAssetsFromVastUrl(vastUrl);
        assets.push(...vastAssets);
      }

      // The event contains inline VAST data.
      if (data) {
        const vastAssets = await getAssetsFromVastData(data);
        assets.push(...vastAssets);
      }
    }

    // The event contains a list of assets, explicitly defined.
    if (event.assets) {
      assets.push(...event.assets);
    }
  }

  // If we have a generic vast config on our session, use that one to resolve (eg; for live streams)
  if (session.vast?.url) {
    const vastUrl = replaceUrlParams(session.vast.url, {
      maxDuration,
    });
    const tempAssets = await getAssetsFromVastUrl(vastUrl);
    assets.push(...tempAssets);
  }

  return assets;
}
