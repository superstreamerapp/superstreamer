import { assert } from "shared/assert";
import { filterMasterPlaylist, formatFilterToQueryParam } from "./filters";
import { getAssets, getStaticDateRanges } from "./interstitials";
import { encrypt } from "./lib/crypto";
import { joinUrl, makeUrl, resolveUri } from "./lib/url";
import {
  parseMasterPlaylist,
  parseMediaPlaylist,
  stringifyMasterPlaylist,
  stringifyMediaPlaylist,
} from "./parser";
import { getRenditions } from "./parser/helpers";
import type { Filter } from "./filters";
import type { Session } from "./session";

export async function formatMasterPlaylist(params: {
  origUrl: string;
  sessionId?: string;
  filter?: Filter;
}) {
  const master = await fetchMasterPlaylist(params.origUrl);

  if (params.filter) {
    filterMasterPlaylist(master, params.filter);
  }

  for (const variant of master.variants) {
    const url = joinUrl(params.origUrl, variant.uri);
    variant.uri = makeMediaUrl({
      url,
      sessionId: params.sessionId,
    });
  }

  const renditions = getRenditions(master.variants);

  renditions.forEach((rendition) => {
    const url = joinUrl(params.origUrl, rendition.uri);
    rendition.uri = makeMediaUrl({
      url,
      sessionId: params.sessionId,
      type: rendition.type,
    });
  });

  return stringifyMasterPlaylist(master);
}

export async function formatMediaPlaylist(
  mediaUrl: string,
  session?: Session,
  renditionType?: string,
) {
  const media = await fetchMediaPlaylist(mediaUrl);

  // We're in a video playlist when we have no renditionType passed along,
  // this means it does not belong to EXT-X-MEDIA, or when we explicitly VIDEO.
  const videoPlaylist = !renditionType || renditionType === "VIDEO";
  const firstSegment = media.segments[0];

  if (session) {
    // If we have a session, we must have a startTime thus meaning we started.
    assert(session.startTime);

    if (media.endlist) {
      assert(firstSegment);
      firstSegment.programDateTime = session.startTime;
    }

    if (videoPlaylist && firstSegment?.programDateTime) {
      // If we have an endlist and a PDT, we can add static date ranges based on this.
      media.dateRanges = getStaticDateRanges(
        firstSegment.programDateTime,
        session,
      );
    }
  }

  media.segments.forEach((segment) => {
    if (segment.map?.uri === "init.mp4") {
      segment.map.uri = joinUrl(mediaUrl, segment.map.uri);
    }
    segment.uri = joinUrl(mediaUrl, segment.uri);
  });

  return stringifyMediaPlaylist(media);
}

export async function formatAssetList(session: Session, timeOffset?: number) {
  const assets = await getAssets(session, timeOffset);
  return {
    ASSETS: assets,
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

export async function fetchDuration(uri: string) {
  const url = resolveUri(uri);
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

export function makeMasterUrl(params: {
  url: string;
  filter?: Filter;
  session?: Session;
}) {
  const fil = formatFilterToQueryParam(params.filter);

  const outUrl = makeUrl("out/master.m3u8", {
    eurl: encrypt(params.url),
    sid: params.session?.id,
    fil,
  });

  const url = params.session
    ? makeUrl(`session/${params.session.id}/master.m3u8`, {
        fil,
      })
    : undefined;

  return { url, outUrl };
}

function makeMediaUrl(params: {
  url: string;
  sessionId?: string;
  type?: string;
}) {
  return makeUrl("out/playlist.m3u8", {
    eurl: encrypt(params.url),
    sid: params.sessionId,
    type: params.type,
  });
}
