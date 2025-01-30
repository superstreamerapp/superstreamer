import type {
  MasterPlaylist,
  MediaInitializationSection,
  MediaPlaylist,
} from "./types";

export function stringifyMasterPlaylist(playlist: MasterPlaylist) {
  const lines: string[] = [];

  lines.push("#EXTM3U", "#EXT-X-VERSION:8");

  if (playlist.independentSegments) {
    lines.push("#EXT-X-INDEPENDENT-SEGMENTS");
  }

  playlist.renditions.forEach((rendition) => {
    const attrs = [
      `TYPE=${rendition.type}`,
      `GROUP-ID="${rendition.groupId}"`,
      `NAME="${rendition.name}"`,
    ];
    if (rendition.language) {
      attrs.push(`LANGUAGE="${rendition.language}"`);
    }
    if (rendition.uri) {
      attrs.push(`URI="${rendition.uri}"`);
    }
    if (rendition.channels) {
      attrs.push(`CHANNELS="${rendition.channels}"`);
    }
    lines.push(`#EXT-X-MEDIA:${attrs.join(",")}`);
  });

  playlist.variants.forEach((variant) => {
    const attrs = [`BANDWIDTH=${variant.bandwidth}`];
    if (variant.codecs) {
      attrs.push(`CODECS="${variant.codecs}"`);
    }
    if (variant.resolution) {
      attrs.push(
        `RESOLUTION=${variant.resolution.width}x${variant.resolution.height}`,
      );
    }
    if (variant.audio) {
      if (
        !playlist.renditions.find(
          (rendition) =>
            rendition.type === "AUDIO" && rendition.groupId === variant.audio,
        )
      ) {
        return;
      }
      attrs.push(`AUDIO="${variant.audio}"`);
    }
    if (variant.subtitles) {
      if (
        !playlist.renditions.find(
          (rendition) =>
            rendition.type === "SUBTITLES" &&
            rendition.groupId === variant.subtitles,
        )
      ) {
        return;
      }
      attrs.push(`SUBTITLES="${variant.subtitles}"`);
    }
    lines.push(`#EXT-X-STREAM-INF:${attrs.join(",")}`);
    lines.push(variant.uri);
  });

  return lines.join("\n");
}

export function stringifyMediaPlaylist(playlist: MediaPlaylist) {
  const lines: string[] = [];

  lines.push(
    "#EXTM3U",
    "#EXT-X-VERSION:8",
    `#EXT-X-TARGETDURATION:${playlist.targetDuration}`,
  );

  if (playlist.independentSegments) {
    lines.push("#EXT-X-INDEPENDENT-SEGMENTS");
  }

  if (playlist.mediaSequenceBase) {
    lines.push(`#EXT-X-MEDIA-SEQUENCE:${playlist.mediaSequenceBase}`);
  }

  if (playlist.discontinuitySequenceBase) {
    lines.push(
      `#EXT-X-DISCONTINUITY-SEQUENCE:${playlist.discontinuitySequenceBase}`,
    );
  }

  if (playlist.playlistType) {
    lines.push(`#EXT-X-PLAYLIST-TYPE:${playlist.playlistType}`);
  }

  let lastMap: MediaInitializationSection | undefined;

  playlist.segments.forEach((segment) => {
    // See https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis-16#section-4.4.4.5
    // It applies to every Media Segment that appears after it in the Playlist until the next
    // EXT-X-MAP tag or until the end of the Playlist.
    if (segment.map !== lastMap) {
      if (segment.map) {
        const attrs = [`URI="${segment.map.uri}"`];
        lines.push(`#EXT-X-MAP:${attrs.join(",")}`);
      }
      lastMap = segment.map;
    }

    if (segment.discontinuity) {
      lines.push(`#EXT-X-DISCONTINUITY`);
    }

    if (segment.spliceInfo) {
      if (segment.spliceInfo.type === "IN") {
        lines.push("#EXT-X-CUE-IN");
      } else if (segment.spliceInfo.type === "OUT") {
        lines.push(`#EXT-X-CUE-OUT:DURATION=${segment.spliceInfo.duration}`);
      }
    }

    if (segment.programDateTime) {
      lines.push(`#EXT-X-PROGRAM-DATE-TIME:${segment.programDateTime.toISO()}`);
    }

    let duration = segment.duration.toFixed(3);
    if (duration.match(/\./)) {
      duration = duration.replace(/\.?0+$/, "");
    }
    lines.push(`#EXTINF:${duration}`);

    lines.push(segment.uri);
  });

  if (playlist.endlist) {
    lines.push(`#EXT-X-ENDLIST`);
  }

  playlist.dateRanges.forEach((dateRange) => {
    const attrs = [
      `ID="${dateRange.id}"`,
      `CLASS="${dateRange.classId}"`,
      `START-DATE="${dateRange.startDate.toISO()}"`,
    ];

    if (dateRange.clientAttributes) {
      const entries = Object.entries(dateRange.clientAttributes);
      for (const [key, value] of entries) {
        if (typeof value === "string") {
          attrs.push(`X-${key}="${value}"`);
        }
        if (typeof value === "number") {
          attrs.push(`X-${key}=${value}`);
        }
      }
    }

    lines.push(`#EXT-X-DATERANGE:${attrs.join(",")}`);
  });

  return lines.join("\n");
}
