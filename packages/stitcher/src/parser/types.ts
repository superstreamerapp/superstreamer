import type { DateTime } from "luxon";

export interface Resolution {
  width: number;
  height: number;
}

export interface Rendition {
  groupId: string;
  name: string;
  type: "AUDIO" | "SUBTITLES";
  uri?: string;
  language?: string;
  channels?: string;
}

export interface Variant {
  uri: string;
  bandwidth: number;
  codecs?: string;
  resolution?: Resolution;
  audio?: string;
  subtitles?: string;
}

export interface MasterPlaylist {
  independentSegments?: boolean;
  variants: Variant[];
  renditions: Rendition[];
}

export interface MediaInitializationSection {
  uri: string;
}

export interface Segment {
  uri: string;
  duration: number;
  discontinuity?: boolean;
  map?: MediaInitializationSection;
  programDateTime?: DateTime;
}

export type PlaylistType = "EVENT" | "VOD";

export interface MediaPlaylist {
  independentSegments?: boolean;
  targetDuration: number;
  endlist: boolean;
  playlistType?: PlaylistType;
  segments: Segment[];
  mediaSequenceBase?: number;
  discontinuitySequenceBase?: number;
  dateRanges: DateRange[];
}

export interface DateRange {
  id: string;
  classId: string;
  startDate: DateTime;
  clientAttributes?: Record<string, string | number>;
}
