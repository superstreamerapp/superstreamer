import type { DateTime } from "luxon";
import type { AppContext } from "./app-context";
import { assert } from "./assert";
import { createUrl } from "./lib/url";
import type { DateRange, Segment } from "./parser";
import { pushTimedEvent } from "./playlist";
import type { Session } from "./session";
import type { Asset, TimedEvent } from "./types";
import { getAssetsFromVastParams } from "./vast";

/**
 * Create dateranges for a session.
 * @param context
 * @param session
 * @param segments
 * @param isLive
 * @returns
 */
export function getStaticDateRanges(
  context: AppContext,
  session: Session,
  segments: Segment[],
  isLive: boolean,
): DateRange[] {
  // Grab a copy of the events in the session, we might add events from
  // elsewhere later on.
  const timedEvents = [...session.timedEvents];

  // Check if segments have event info (such as splice info) and push them
  // to the list of events.
  const segmentTimedEvents = getTimedEventsFromSegments(segments);
  for (const event of segmentTimedEvents) {
    pushTimedEvent(timedEvents, event);
  }

  return timedEvents.map((timedEvent) => {
    const assetListUrl = createUrl(context, "out/asset-list.json", {
      dt: timedEvent.dateTime.toISO(),
      sid: session.id,
      dur: timedEvent.duration,
    });

    const clientAttributes: Record<string, number | string> = {
      RESTRICT: "SKIP,JUMP",
      "ASSET-LIST": assetListUrl,
      "CONTENT-MAY-VARY": "YES",
      "TIMELINE-STYLE": "HIGHLIGHT",
    };

    if (isLive) {
      assert(timedEvent.duration);

      clientAttributes["TIMELINE-OCCUPIES"] = "RANGE";
      clientAttributes["PLAYOUT-LIMIT"] = timedEvent.duration;
    } else {
      clientAttributes["TIMELINE-OCCUPIES"] = "POINT";
      clientAttributes["RESUME-OFFSET"] = timedEvent.duration ?? 0;
    }

    const cue: string[] = [];
    if (timedEvent.dateTime.equals(session.startTime)) {
      cue.push("ONCE", "PRE");
    }

    if (cue.length) {
      clientAttributes["CUE"] = cue.join(",");
    }

    return {
      classId: "com.apple.hls.interstitial",
      id: `sprs.${timedEvent.dateTime.toMillis()}`,
      startDate: timedEvent.dateTime,
      plannedDuration:
        clientAttributes["TIMELINE-OCCUPIES"] === "RANGE" && timedEvent.duration
          ? timedEvent.duration
          : undefined,
      clientAttributes,
    };
  });
}

/**
 * Find signaling in a list of segments and map them to events. These events
 * can then be used to insert interstitials.
 * @param segments
 * @returns
 */
function getTimedEventsFromSegments(segments: Segment[]) {
  const events: TimedEvent[] = [];

  for (const segment of segments) {
    if (segment.spliceInfo?.type !== "OUT" || !segment.programDateTime) {
      continue;
    }

    events.push({
      dateTime: segment.programDateTime,
      duration: segment.spliceInfo.duration,
      assets: [],
    });
  }

  return events;
}

/**
 * Get a list of assets for a request. This will be used in an ASSET-LIST tag
 * to resolve the interstitial to one or multiple assets.
 * @param context
 * @param session
 * @param dateTime
 * @param maxDuration
 * @returns
 */
export async function getAssets(
  context: AppContext,
  session: Session,
  dateTime: DateTime,
  maxDuration?: number,
): Promise<Asset[]> {
  const timedEvent = session.timedEvents.find((e) =>
    e.dateTime.equals(dateTime),
  );

  const assets: Asset[] = [];

  if (timedEvent) {
    if (timedEvent.vast) {
      const vastAssets = await getAssetsFromVastParams(
        context,
        timedEvent.vast,
        {
          maxDuration,
        },
      );
      assets.push(...vastAssets);
    }

    if (timedEvent.assets) {
      assets.push(...timedEvent.assets);
    }

    if (timedEvent.delay) {
      // When we have a delay on purpose, wait it out.
      await new Promise((resolve) => {
        setTimeout(resolve, timedEvent.delay);
      });
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
