import { assert } from "shared/assert";
import { filterMasterPlaylist, formatFilterToQueryParam } from "./filters";
import { getAssets, getStaticDateRanges } from "./interstitials";
import { encrypt } from "./lib/crypto";
import { createUrl, joinUrl, replaceUrlParams } from "./lib/url";
import {
  parseMasterPlaylist,
  parseMediaPlaylist,
  stringifyMasterPlaylist,
  stringifyMediaPlaylist,
} from "./parser";
import { updateSession } from "./session";
import { fetchVmap, toAdBreakTimeOffset } from "./vmap";
import type { Filter } from "./filters";
import type { MasterPlaylist, MediaPlaylist } from "./parser";
import type { Session } from "./session";
import type { TimedEvent } from "./types";
import type { VmapAdBreak } from "./vmap";
import type { DateTime } from "luxon";

export async function formatMasterPlaylist(params: {
  origUrl: string;
  session: Session;
  filter?: Filter;
}) {
  await initSessionOnMasterReq(params.session);

  const master = await fetchMasterPlaylist(params.origUrl);

  if (params.filter) {
    filterMasterPlaylist(master, params.filter);
  }

  rewriteMasterPlaylistUrls(master, params);

  return stringifyMasterPlaylist(master);
}

export async function formatMediaPlaylist(
  mediaUrl: string,
  session: Session,
  type: "video" | "audio" | "subtitles",
) {
  const media = await fetchMediaPlaylist(mediaUrl);

  const firstSegment = media.segments[0];
  assert(firstSegment);

  if (media.endlist) {
    firstSegment.programDateTime = session.startTime;
  }

  // Apply dateRanges to each video playlist.
  if (type === "video") {
    // If we have an endlist and a PDT, we can add static date ranges based on this.
    const isLive = !media.endlist;

    media.dateRanges = getStaticDateRanges(session, media.segments, isLive);
  }

  rewriteSpliceInfoSegments(media);

  rewriteMediaPlaylistUrls(media, mediaUrl);

  return stringifyMediaPlaylist(media);
}

export async function formatAssetList(
  session: Session,
  dateTime: DateTime,
  maxDuration?: number,
) {
  const assets = await getAssets(session, dateTime, maxDuration);

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

export function createMasterUrl(params: {
  url: string;
  session: Session;
  filter?: Filter;
}) {
  const fil = formatFilterToQueryParam(params.filter);

  const url = createUrl("out/master.m3u8", {
    eurl: encrypt(params.url),
    sid: params.session.id,
    fil,
  });

  return url;
}

function createMediaUrl(params: {
  url: string;
  sessionId: string;
  type: "video" | "audio" | "subtitles";
}) {
  return createUrl("out/playlist.m3u8", {
    eurl: encrypt(params.url),
    sid: params.sessionId,
    type: params.type,
  });
}

export function rewriteMasterPlaylistUrls(
  master: MasterPlaylist,
  params: {
    origUrl: string;
    session: Session;
  },
) {
  for (const variant of master.variants) {
    const url = joinUrl(params.origUrl, variant.uri);
    variant.uri = createMediaUrl({
      url,
      sessionId: params.session.id,
      type: "video",
    });
  }

  for (const rendition of master.renditions) {
    if (!rendition.uri) {
      continue;
    }

    const url = joinUrl(params.origUrl, rendition.uri);

    let type: "audio" | "subtitles" | undefined;
    if (rendition.type === "AUDIO") {
      type = "audio";
    } else if (rendition.type === "SUBTITLES") {
      type = "subtitles";
    }

    if (!type) {
      continue;
    }

    rendition.uri = createMediaUrl({
      url,
      sessionId: params.session.id,
      type,
    });
  }
}

export function rewriteMediaPlaylistUrls(
  media: MediaPlaylist,
  mediaUrl: string,
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

async function initSessionOnMasterReq(session: Session) {
  let storeSession = false;

  // If we have a vmap config but no result yet, we'll resolve it.
  if (session.vmap && !session.vmap.result) {
    const vmapUrl = replaceUrlParams(session.vmap.url);
    const vmap = await fetchVmap(vmapUrl);

    // Store an empty object, if we want vmap specific info to be stored
    // across sessions later, we can do it here, such as tracking pixels.
    session.vmap.result = {};

    vmap.adBreaks.forEach((adBreak) => {
      const event = mapAdBreakToTimedEvent(session.startTime, adBreak);
      if (event) {
        session.events.push(event);
      }
    });

    storeSession = true;
  }

  if (storeSession) {
    await updateSession(session);
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
