import { assert } from "shared/assert";
import { lexicalParse } from "./lexical-parse";
import type { Media, StreamInf, Tag } from "./lexical-parse";
import type {
  DateRange,
  MasterPlaylist,
  MediaInitializationSection,
  MediaPlaylist,
  PlaylistType,
  Rendition,
  Segment,
  Variant,
} from "./types";
import type { DateTime } from "luxon";

function formatMediaPlaylist(tags: Tag[]): MediaPlaylist {
  let targetDuration: number | undefined;
  let endlist = false;
  let playlistType: PlaylistType | undefined;
  let independentSegments = false;
  let mediaSequenceBase: number | undefined;
  let discontinuitySequenceBase: number | undefined;
  let map: MediaInitializationSection | undefined;
  const dateRanges: DateRange[] = [];

  tags.forEach(([name, value]) => {
    if (name === "EXT-X-TARGETDURATION") {
      targetDuration = value;
    }
    if (name === "EXT-X-ENDLIST") {
      endlist = true;
    }
    if (name === "EXT-X-PLAYLIST-TYPE") {
      playlistType = value;
    }
    if (name === "EXT-X-MAP") {
      map = value;
    }
    if (name === "EXT-X-INDEPENDENT-SEGMENTS") {
      independentSegments = true;
    }
    if (name === "EXT-X-MEDIA-SEQUENCE") {
      mediaSequenceBase = value;
    }
    if (name === "EXT-X-DISCONTINUITY-SEQUENCE") {
      discontinuitySequenceBase = value;
    }
    if (name === "EXT-X-DATERANGE") {
      dateRanges.push(value);
    }
  });

  const segments: Segment[] = [];
  let segmentStart = -1;

  tags.forEach(([name], index) => {
    if (isSegmentTag(name)) {
      segmentStart = index - 1;
    }

    if (name === "LITERAL") {
      if (segmentStart < 0) {
        throw new Error("LITERAL: no segment start");
      }
      const segmentTags = tags.slice(segmentStart, index + 1);
      const uri = nextLiteral(segmentTags, segmentTags.length - 2);

      const segment = parseSegment(segmentTags, uri, map);
      segments.push(segment);

      segmentStart = -1;
    }
  });

  assert(targetDuration);

  return {
    targetDuration,
    endlist,
    playlistType,
    segments,
    independentSegments,
    mediaSequenceBase,
    discontinuitySequenceBase,
    dateRanges,
  };
}

function parseSegment(
  tags: Tag[],
  uri: string,
  map?: MediaInitializationSection,
): Segment {
  let duration: number | undefined;
  let discontinuity: boolean | undefined;
  let programDateTime: DateTime | undefined;

  tags.forEach(([name, value]) => {
    if (name === "EXTINF") {
      duration = value.duration;
    }
    if (name === "EXT-X-DISCONTINUITY") {
      discontinuity = true;
    }
    if (name === "EXT-X-PROGRAM-DATE-TIME") {
      programDateTime = value;
    }
  });

  assert(duration, "parseSegment: duration not found");

  return {
    uri,
    duration,
    discontinuity,
    map,
    programDateTime,
  };
}

function createRendition(media: Media, renditions: Map<string, Rendition>) {
  let rendition = renditions.get(media.uri);
  if (rendition) {
    return rendition;
  }

  rendition = {
    type: media.type,
    groupId: media.groupId,
    name: media.name,
    language: media.language,
    uri: media.uri,
    channels: media.channels,
  };

  renditions.set(media.uri, rendition);

  return rendition;
}

function addRendition(
  variant: Variant,
  media: Media,
  renditions: Map<string, Rendition>,
) {
  const rendition = createRendition(media, renditions);

  if (media.type === "AUDIO") {
    variant.audio.push(rendition);
  }

  if (media.type === "SUBTITLES") {
    variant.subtitles.push(rendition);
  }
}

function parseVariant(
  tags: Tag[],
  streamInf: StreamInf,
  uri: string,
  renditions: Map<string, Rendition>,
) {
  const variant: Variant = {
    uri,
    bandwidth: streamInf.bandwidth,
    resolution: streamInf.resolution,
    codecs: streamInf.codecs,
    audio: [],
    subtitles: [],
  };

  for (const [name, value] of tags) {
    if (name === "EXT-X-MEDIA") {
      if (
        streamInf.audio === value.groupId ||
        streamInf.subtitles === value.groupId
      ) {
        addRendition(variant, value, renditions);
      }
    }
  }

  return variant;
}

function formatMasterPlaylist(tags: Tag[]): MasterPlaylist {
  const variants: Variant[] = [];
  let independentSegments = false;

  const renditions = new Map<string, Rendition>();

  tags.forEach(([name, value], index) => {
    if (name === "EXT-X-STREAM-INF") {
      const uri = nextLiteral(tags, index);
      const variant = parseVariant(tags, value, uri, renditions);
      variants.push(variant);
    }
    if (name === "EXT-X-INDEPENDENT-SEGMENTS") {
      independentSegments = true;
    }
  });

  return {
    independentSegments,
    variants,
  };
}

function nextLiteral(tags: Tag[], index: number) {
  if (!tags[index + 1]) {
    throw new Error("Expecting next tag to be found");
  }
  const tag = tags[index + 1];
  if (!tag) {
    throw new Error(`Expected valid tag on ${index + 1}`);
  }
  const [name, value] = tag;
  if (name !== "LITERAL") {
    throw new Error("Expecting next tag to be a literal");
  }
  return value;
}

function isSegmentTag(name: Tag[0]) {
  switch (name) {
    case "EXTINF":
    case "EXT-X-DISCONTINUITY":
    case "EXT-X-MAP":
    case "EXT-X-PROGRAM-DATE-TIME":
      return true;
  }
  return false;
}

export function parseMasterPlaylist(text: string) {
  const tags = lexicalParse(text);
  return formatMasterPlaylist(tags);
}

export function parseMediaPlaylist(text: string) {
  const tags = lexicalParse(text);
  return formatMediaPlaylist(tags);
}
