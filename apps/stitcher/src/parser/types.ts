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
  default?: boolean;
  autoSelect?: boolean;
  characteristics?: string[];
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
  defines: Define[];
}

export interface MediaInitializationSection {
  uri: string;
}

export interface Segment {
  uri: string;
  duration: number;
  discontinuity?: boolean;
  map?: MediaInitializationSection;
  key?: Key;
  programDateTime?: DateTime;
  spliceInfo?: SpliceInfo;
}

export interface SpliceInfo {
  type: "IN" | "OUT";
  duration?: number;
}

export type PlaylistType = "EVENT" | "VOD";

export interface Key {
  method: string;
  uri?: string;
  iv?: Uint8Array;
  format?: string;
  formatVersion?: string;
}

export interface MediaPlaylist {
  independentSegments?: boolean;
  targetDuration: number;
  endlist: boolean;
  playlistType?: PlaylistType;
  segments: Segment[];
  mediaSequenceBase?: number;
  discontinuitySequenceBase?: number;
  dateRanges: DateRange[];
  defines: Define[];
}

export interface DateRange {
  id: string;
  classId: string;
  startDate: DateTime;
  duration?: number;
  plannedDuration?: number;
  clientAttributes?: Record<string, string | number>;
}

export interface Define {
  name?: string;
  value?: string;
  queryParam?: string;
  import?: string;
}
