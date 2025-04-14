import { assert } from "shared/assert";
import { filterMasterPlaylist, formatFilterToQueryParam } from "./filters";
import { getAssets, getStaticDateRanges } from "./interstitials";
import { createUrl, joinUrl, replaceUrlParams } from "./lib/url";
import {
  parseMasterPlaylist,
  parseMediaPlaylist,
  stringifyMasterPlaylist,
  stringifyMediaPlaylist,
} from "./parser";
import { updateSession } from "./session";
import { fetchVmap, toAdBreakTimeOffset } from "./vmap";
import type { AppContext } from "./app-context";
import type { Filter } from "./filters";
import type { MasterPlaylist, MediaPlaylist } from "./parser";
import type { Session } from "./session";
import type { TimedEvent } from "./types";
import type { VmapAdBreak } from "./vmap";
import type { DateTime } from "luxon";

export async function formatMasterPlaylist(
  context: AppContext,
  session: Session,
  url: string,
  filter?: Filter,
) {
  await initSessionOnMasterReq(context, session);

  const master = await fetchMasterPlaylist(url);

  if (filter) {
    filterMasterPlaylist(master, filter);
  }

  addMasterPlaylistDefines(session, master);

  rewriteMasterPlaylistUrls(context, session, url, master);

  return stringifyMasterPlaylist(master);
}

export async function formatMediaPlaylist(
  context: AppContext,
  session: Session,
  url: string,
  type: "video" | "audio" | "subtitles",
) {
  const media = await fetchMediaPlaylist(url);

  const firstSegment = media.segments[0];
  assert(firstSegment);

  if (media.endlist) {
    firstSegment.programDateTime = session.startTime;
  }

  // Apply dateRanges to each video playlist.
  if (type === "video") {
    const isLive = !media.endlist;
    media.dateRanges = getStaticDateRanges(
      context,
      session,
      media.segments,
      isLive,
    );
  }

  rewriteSpliceInfoSegments(media);

  rewriteMediaPlaylistUrls(url, media);

  return stringifyMediaPlaylist(media);
}

export async function formatAssetList(
  context: AppContext,
  session: Session,
  dateTime: DateTime,
  maxDuration?: number,
) {
  const assets = await getAssets(context, session, dateTime, maxDuration);

  return {
    ASSETS: assets.map((asset) => {
      return {
        URI: asset.url,
        DURATION: asset.duration,
      };
    }),
  };
}

async function fetchMasterPlaylist(url: string) {
  const response = await fetch(url);
  const result = await response.text();
  return parseMasterPlaylist(result);
}

async function fetchMediaPlaylist(url: string) {
  const response = await fetch(url);
  const result = await response.text();
  return parseMediaPlaylist(result);
}

export async function fetchDuration(url: string) {
  const variant = (await fetchMasterPlaylist(url))?.variants[0];

  if (!variant) {
    throw new Error(`Missing variant for "${url}"`);
  }

  const media = await fetchMediaPlaylist(joinUrl(url, variant.uri));
  return media.segments.reduce((acc, segment) => {
    acc += segment.duration;
    return acc;
  }, 0);
}

export function createOpaqueMasterUrl(
  context: AppContext,
  session: Session,
  filter?: Filter,
) {
  const fil = formatFilterToQueryParam(filter);

  return createUrl(context, `sessions/${session.id}/master.m3u8`, {
    fil,
  });
}

export function createMasterUrl(
  context: AppContext,
  session: Session,
  url: string,
  filter?: Filter,
) {
  const fil = formatFilterToQueryParam(filter);

  return createUrl(context, "out/master.m3u8", {
    eurl: context.cipher.encrypt(url),
    sid: session.id,
    fil,
  });
}

function createMediaUrl(
  context: AppContext,
  session: Session,
  url: string,
  type: "video" | "audio" | "subtitles",
) {
  return createUrl(context, "out/playlist.m3u8", {
    eurl: context.cipher.encrypt(url),
    sid: session.id,
    type,
  });
}

export function rewriteMasterPlaylistUrls(
  context: AppContext,
  session: Session,
  masterUrl: string,
  master: MasterPlaylist,
) {
  for (const variant of master.variants) {
    const variantUrl = joinUrl(masterUrl, variant.uri);
    variant.uri = createMediaUrl(context, session, variantUrl, "video");
  }

  for (const rendition of master.renditions) {
    if (!rendition.uri) {
      continue;
    }

    const renditionUrl = joinUrl(masterUrl, rendition.uri);

    let type: "audio" | "subtitles" | undefined;
    if (rendition.type === "AUDIO") {
      type = "audio";
    } else if (rendition.type === "SUBTITLES") {
      type = "subtitles";
    }

    if (!type) {
      continue;
    }

    rendition.uri = createMediaUrl(context, session, renditionUrl, type);
  }
}

export function addMasterPlaylistDefines(
  session: Session,
  master: MasterPlaylist,
) {
  for (const def of session.defines) {
    if (def.name && def.value !== undefined) {
      // name + value
      master.defines.push({
        name: def.name,
        value: def.value,
      });
    }
    if (def.name && def.value === undefined) {
      // queryparam
      master.defines.push({
        queryParam: def.name,
      });
    }
  }
}

export function rewriteMediaPlaylistUrls(
  mediaUrl: string,
  media: MediaPlaylist,
) {
  media.segments.forEach((segment) => {
    if (segment.map?.uri === "init.mp4") {
      segment.map.uri = joinUrl(mediaUrl, segment.map.uri);
    }
    segment.uri = joinUrl(mediaUrl, segment.uri);
  });
}

/**
 * Go over each segment in a media playlist and swap the splice info for a discontinuity.
 * @param media
 */
export function rewriteSpliceInfoSegments(media: MediaPlaylist) {
  media.segments.forEach((segment) => {
    if (segment.spliceInfo) {
      delete segment.spliceInfo;
      segment.discontinuity = true;
    }
  });
}

async function initSessionOnMasterReq(context: AppContext, session: Session) {
  let storeSession = false;

  // If we have a vmap config but no result yet, we'll resolve it.
  if (session.vmap && !session.vmap.result) {
    const vmapUrl = replaceUrlParams(session.vmap.url);
    const vmap = await fetchVmap(vmapUrl);

    // Store an empty object, if we want vmap specific info to be stored
    // across sessions later, we can do it here, such as tracking pixels.
    session.vmap.result = {};

    vmap.adBreaks.forEach((adBreak) => {
      const timedEvent = mapAdBreakToTimedEvent(session.startTime, adBreak);
      if (timedEvent) {
        pushTimedEvent(session.timedEvents, timedEvent);
      }
    });

    storeSession = true;
  }

  if (storeSession) {
    await updateSession(context, session);
  }
}

export function mapAdBreakToTimedEvent(
  startTime: DateTime,
  adBreak: VmapAdBreak,
): TimedEvent | null {
  const timeOffset = toAdBreakTimeOffset(adBreak);

  if (timeOffset === null) {
    return null;
  }

  const dateTime = startTime.plus({ seconds: timeOffset });

  return {
    dateTime,
    vast: {
      url: adBreak.vastUrl,
      data: adBreak.vastData,
    },
  };
}

export function pushTimedEvent(events: TimedEvent[], nextEvent: TimedEvent) {
  const target = events.find((event) =>
    event.dateTime.equals(nextEvent.dateTime),
  );
  if (target) {
    if (nextEvent.assets) {
      if (!target.assets) {
        target.assets = [];
      }
      target.assets.push(...nextEvent.assets);
    }
    if (nextEvent.vast) {
      target.vast = nextEvent.vast;
    }
    if (nextEvent.duration) {
      target.duration = nextEvent.duration;
    }
  } else {
    events.push(nextEvent);
  }
}
