import type { Stream } from "./types";

export interface FfmpegResult {
  name: string;
  stream: Stream;
}

export interface FfprobeResult {
  video: Record<
    string,
    {
      height?: number;
      framerate?: number;
    }
  >;
  audio: Record<
    string,
    {
      language?: string;
      channels?: number;
    }
  >;
}

export interface TranscodeResult {
  assetId: string;
}

export interface PackageResult {
  assetId: string;
}

export interface PipelineResult {
  assetId: string;
}

export interface ImageResult {
  assetId: string;
}
