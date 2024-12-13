import { assert } from "shared/assert";
import { filterMasterPlaylist, formatFilterToQueryParam } from "./filters";
import {
  appendInterstitials,
  getAssets,
  getStaticDateRanges,
} from "./interstitials";
import { encrypt } from "./lib/crypto";
import { createUrl, joinUrl, resolveUri } from "./lib/url";
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
import type { Interstitial } from "./types";
import type { VmapAdBreak } from "./vmap";
import type { DateTime } from "luxon";

export async function formatMasterPlaylist(params: {
  origUrl: string;
  session?: Session;
  filter?: Filter;
}) {
  if (params.session) {
    await initSessionOnMasterReq(params.session);
  }

  const master = await fetchMasterPlaylist(params.origUrl);

  if (params.filter) {
    filterMasterPlaylist(master, params.filter);
  }

  rewriteMasterPlaylistUrls(master, params);

  return stringifyMasterPlaylist(master);
}

export async function formatMediaPlaylist(
  mediaUrl: string,
  session?: Session,
  renditionType?: string,
) {
  const media = await fetchMediaPlaylist(mediaUrl);

  // We're in a video playlist when we have no renditionType passed along,
  // this means it does not belong to EXT-X-MEDIA.
  const videoPlaylist = renditionType === undefined;
  const firstSegment = media.segments[0];

  if (session) {
    assert(firstSegment);

    if (media.endlist) {
      firstSegment.programDateTime = session.startTime;
    }

    if (videoPlaylist) {
      // If we have an endlist and a PDT, we can add static date ranges based on this.
      const isLive = !media.endlist;
      media.dateRanges = getStaticDateRanges(session, isLive);
    }
  }

  rewriteMediaPlaylistUrls(media, mediaUrl);

  return stringifyMediaPlaylist(media);
}

export async function formatAssetList(session: Session, dateTime: DateTime) {
  const assets = await getAssets(session, dateTime);

  const assetsPromises = assets.map(async (asset) => {
    return {
      URI: asset.url,
      DURATION: asset.duration ?? (await fetchDuration(asset.url)),
      "SPRS-KIND": asset.kind,
    };
  });

  return {
    ASSETS: await Promise.all(assetsPromises),
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

export function createMasterUrl(params: {
  url: string;
  filter?: Filter;
  session?: Session;
}) {
  const fil = formatFilterToQueryParam(params.filter);

  const outUrl = createUrl("out/master.m3u8", {
    eurl: encrypt(params.url),
    sid: params.session?.id,
    fil,
  });

  const url = params.session
    ? createUrl(`session/${params.session.id}/master.m3u8`, {
        fil,
      })
    : undefined;

  return { url, outUrl };
}

function createMediaUrl(params: {
  url: string;
  sessionId?: string;
  type?: "AUDIO" | "SUBTITLES";
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
    session?: Session;
  },
) {
  for (const variant of master.variants) {
    const url = joinUrl(params.origUrl, variant.uri);
    variant.uri = createMediaUrl({
      url,
      sessionId: params.session?.id,
    });
  }

  for (const rendition of master.renditions) {
    if (!rendition.uri) {
      continue;
    }
    const url = joinUrl(params.origUrl, rendition.uri);
    rendition.uri = createMediaUrl({
      url,
      sessionId: params.session?.id,
      type: rendition.type,
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

async function initSessionOnMasterReq(session: Session) {
  let storeSession = false;

  if (session.vmap) {
    const vmap = await fetchVmap(session.vmap);

    delete session.vmap;

    const interstitials = mapAdBreaksToSessionInterstitials(
      session,
      vmap.adBreaks,
    );
    appendInterstitials(session.interstitials, interstitials);

    storeSession = true;
  }

  if (storeSession) {
    await updateSession(session);
  }
}

export function mapAdBreaksToSessionInterstitials(
  session: Session,
  adBreaks: VmapAdBreak[],
) {
  const interstitials: Interstitial[] = [];

  for (const adBreak of adBreaks) {
    const timeOffset = toAdBreakTimeOffset(adBreak);

    if (timeOffset === null) {
      continue;
    }

    const dateTime = session.startTime.plus({ seconds: timeOffset });

    interstitials.push({
      dateTime,
      vast: {
        url: adBreak.vastUrl,
        data: adBreak.vastData,
      },
    });
  }

  return interstitials;
}
