import type { LangCode, VideoCodec, AudioCodec } from "shared/typebox";

export const DEFAULT_SEGMENT_SIZE = 2.24;

export const DEFAULT_PACKAGE_NAME = "hls";

export type PartialStream =
  | {
      type: "video";
      codec: VideoCodec;
      height: number;
      bitrate?: number;
      framerate?: number;
    }
  | {
      type: "audio";
      codec: AudioCodec;
      bitrate?: number;
      language?: LangCode;
      channels?: number;
    }
  | {
      type: "text";
      language: LangCode;
    };

export type Stream = Required<PartialStream>;

export type PartialInput =
  | {
      type: "video";
      path: string;
      height?: number;
      framerate?: number;
    }
  | {
      type: "audio";
      path: string;
      language?: LangCode;
      channels?: number;
    }
  | {
      type: "text";
      path: string;
      language: LangCode;
    };

export type Input = Required<PartialInput>;