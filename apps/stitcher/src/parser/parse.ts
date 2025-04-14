import { assert } from "shared/assert";
import { lexicalParse } from "./lexical-parse";
import type { Tag } from "./lexical-parse";
import type {
  DateRange,
  Define,
  Key,
  MasterPlaylist,
  MediaInitializationSection,
  MediaPlaylist,
  PlaylistType,
  Rendition,
  Segment,
  SpliceInfo,
  Variant,
} from "./types";
import type { DateTime } from "luxon";

function formatMasterPlaylist(tags: Tag[]): MasterPlaylist {
  let independentSegments = false;
  const variants: Variant[] = [];
  const renditions: Rendition[] = [];
  const defines: Define[] = [];

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
        default: value.default,
        autoSelect: value.autoSelect,
        characteristics: value.characteristics,
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
    if (name === "EXT-X-DEFINE") {
      defines.push({
        name: value.name,
        value: value.value,
        queryParam: value.queryParam,
        import: value.import,
      });
    }
  });

  return {
    independentSegments,
    variants,
    renditions,
    defines,
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
  const defines: Define[] = [];

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
    if (name === "EXT-X-DEFINE") {
      defines.push({
        name: value.name,
        value: value.value,
        queryParam: value.queryParam,
        import: value.import,
      });
    }
  });

  const segments: Segment[] = [];
  let segmentStart = -1;

  let map: MediaInitializationSection | undefined;
  let key: Key | undefined;
  tags.forEach(([name, value], index) => {
    if (name === "EXT-X-MAP") {
      // TODO: We might be better off passing on segments to |parseSegment| and look up
      // the last valid map.
      map = value;
    }
    if (name === "EXT-X-KEY") {
      // TODO: We might be better off passing on segments to |parseSegment| and look up
      // the last valid key.
      key = value;
    }

    // TODO: When we have EXT-X-KEY support, we're better off passing a full list of segments
    // to |parseSegment|, maybe?

    // If we're not yet capturing for a specific segment and the tag belongs to a segment,
    // mark this tag as the start of the segment.
    if (segmentStart === -1 && isSegmentTag(name)) {
      segmentStart = index - 1;
    }

    if (name === "LITERAL") {
      if (segmentStart < 0) {
        throw new Error("LITERAL: no segment start");
      }

      const segmentTags = tags.slice(segmentStart, index + 1);
      const uri = nextLiteral(segmentTags, segmentTags.length - 2);

      const segment = parseSegment(segmentTags, uri, map, key);
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
    defines,
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

/**
 * Checks whether the tag name belongs to a segment.
 * @link https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis-16#section-4.4.4
 * @param name
 * @returns
 */
function isSegmentTag(name: Tag[0]) {
  switch (name) {
    case "EXTINF":
    case "EXT-X-DISCONTINUITY":
    case "EXT-X-PROGRAM-DATE-TIME":
    case "EXT-X-MAP":
    case "EXT-X-CUE-OUT":
    case "EXT-X-CUE-IN":
    case "EXT-X-KEY":
      return true;
  }
  return false;
}

function parseSegment(
  tags: Tag[],
  uri: string,
  map?: MediaInitializationSection,
  key?: Key,
): Segment {
  let duration: number | undefined;
  let discontinuity: boolean | undefined;
  let programDateTime: DateTime | undefined;
  let spliceInfo: SpliceInfo | undefined;

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
    if (name === "EXT-X-CUE-IN") {
      spliceInfo = { type: "IN" };
    }
    if (name === "EXT-X-CUE-OUT") {
      spliceInfo = { type: "OUT", duration: value.duration };
    }
  });

  assert(duration, "parseSegment: duration not found");

  return {
    uri,
    duration,
    discontinuity,
    map,
    key,
    programDateTime,
    spliceInfo,
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
