import { assert } from "shared/assert";
import { lexicalParse } from "./lexical-parse";
import type { Tag } from "./lexical-parse";
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

function formatMasterPlaylist(tags: Tag[]): MasterPlaylist {
  let independentSegments = false;
  const variants: Variant[] = [];
  const renditions: Rendition[] = [];

  tags.forEach(([name, value], index) => {
    if (name === "EXT-X-INDEPENDENT-SEGMENTS") {
      independentSegments = true;
    }
    if (name === "EXT-X-MEDIA") {
      renditions.push({
        type: value.type,
        groupId: value.groupId,
        name: value.name,
        uri: value.uri,
        channels: value.channels,
        language: value.language,
      });
    }
    if (name === "EXT-X-STREAM-INF") {
      const uri = nextLiteral(tags, index);
      variants.push({
        uri,
        bandwidth: value.bandwidth,
        resolution: value.resolution,
        codecs: value.codecs,
        audio: value.audio,
        subtitles: value.subtitles,
      });
    }
  });

  return {
    independentSegments,
    variants,
    renditions,
  };
}

function formatMediaPlaylist(tags: Tag[]): MediaPlaylist {
  let targetDuration: number | undefined;
  let endlist = false;
  let playlistType: PlaylistType | undefined;
  let independentSegments = false;
  let mediaSequenceBase: number | undefined;
  let discontinuitySequenceBase: number | undefined;
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

  let map: MediaInitializationSection | undefined;
  tags.forEach(([name, value], index) => {
    if (name === "EXT-X-MAP") {
      map = value;
    }

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
    case "EXT-X-PROGRAM-DATE-TIME":
      return true;
  }
  return false;
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

export function parseMasterPlaylist(text: string) {
  const tags = lexicalParse(text);
  return formatMasterPlaylist(tags);
}

export function parseMediaPlaylist(text: string) {
  const tags = lexicalParse(text);
  return formatMediaPlaylist(tags);
}
