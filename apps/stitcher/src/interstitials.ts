import { DateTime } from "luxon";
import { createUrl } from "./lib/url";
import { getAssetsFromVastParams } from "./vast";
import type { AppContext } from "./app-context";
import type { DateRange, Segment } from "./parser";
import type { Session } from "./session";
import type { Asset, TimedEvent } from "./types";

interface Group {
  showTimeline: boolean;
  duration?: number;
}

export function getStaticDateRanges(
  context: AppContext,
  session: Session,
  segments: Segment[],
) {
  const groups = new Map<number, Group>();

  for (const event of session.events) {
    groupEvent(groups, event);
  }

  const derivedEvents = getTimedEventsFromSegments(segments);

  for (const event of derivedEvents) {
    groupEvent(groups, event);
  }

  const dateRanges: DateRange[] = [];

  Array.from(groups.entries()).forEach(([ts, group]) => {
    const dateTime = DateTime.fromMillis(ts);

    const assetListUrl = createUrl(context, "out/asset-list.json", {
      dt: dateTime.toISO(),
      sid: session.id,
      mdur: group.duration,
    });

    const clientAttributes: Record<string, number | string> = {
      RESTRICT: "SKIP,JUMP",
      "ASSET-LIST": assetListUrl,
      "CONTENT-MAY-VARY": "YES",
      "TIMELINE-STYLE": group.showTimeline ? "HIGHLIGHT" : "PRIMARY",
      "TIMELINE-OCCUPIES": group.duration ? "RANGE" : "POINT",
      "RESUME-OFFSET": group.duration ?? 0,
    };

    if (group.duration) {
      clientAttributes["PLAYOUT-LIMIT"] = group.duration;
    }

    const cue: string[] = [];
    if (dateTime.equals(session.startTime)) {
      cue.push("PRE");
    }

    if (cue.length) {
      clientAttributes["CUE"] = cue.join(",");
    }

    dateRanges.push({
      classId: "com.apple.hls.interstitial",
      id: `sprs.${dateTime.toMillis()}`,
      startDate: dateTime,
      duration: group.duration,
      clientAttributes,
    });
  });

  return dateRanges;
}

function groupEvent(groups: Map<number, Group>, event: TimedEvent) {
  const ts = event.dateTime.toMillis();

  let group = groups.get(ts);
  if (!group) {
    group = {
      showTimeline: false,
    };
    groups.set(ts, group);
  }

  // If we have another event with a duration, we'll take the largest one to cover
  // the entire interstitial.
  if (event.duration && (!group.duration || event.duration > group.duration)) {
    group.duration = event.duration;
  }

  if (event.vast) {
    group.showTimeline = true;
  }
}

function getTimedEventsFromSegments(segments: Segment[]) {
  const events: TimedEvent[] = [];

  for (const segment of segments) {
    if (segment.spliceInfo?.type !== "OUT" || !segment.programDateTime) {
      continue;
    }

    events.push({
      dateTime: segment.programDateTime,
      duration: segment.spliceInfo.duration,
    });
  }

  return events;
}

export async function getAssets(
  context: AppContext,
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
    // The event contains VAST params, let's resolve them.
    if (event.vast) {
      const vastAssets = await getAssetsFromVastParams(context, event.vast, {
        maxDuration,
      });
      assets.push(...vastAssets);
    }

    // The event contains a list of assets, explicitly defined.
    if (event.asset) {
      assets.push(event.asset);
    }
  }

  // If we have a generic vast config on our session, use that one to resolve (eg; for live streams)
  if (session.vast) {
    const tempAssets = await getAssetsFromVastParams(context, session.vast, {
      maxDuration,
    });
    assets.push(...tempAssets);
  }

  return assets;
}
