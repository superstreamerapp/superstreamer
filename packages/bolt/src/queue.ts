import { Queue } from "bullmq";
import { connection } from "./env";
import type { Input, PartialInput, PartialStream, Stream } from "./types";

export interface PipelineData {
  assetId: string;
  inputs: PartialInput[];
  streams: PartialStream[];
  segmentSize: number;
  group?: string;
  language?: string;
  name: string;
}

export const pipelineQueue = new Queue<PipelineData>("pipeline", {
  connection,
});

export interface TranscodeData {
  assetId: string;
  inputs: PartialInput[];
  streams: PartialStream[];
  segmentSize: number;
  group?: string;
}

export const transcodeQueue = new Queue<TranscodeData>("transcode", {
  connection,
});

export interface PackageData {
  assetId: string;
  language?: string;
  segmentSize?: number;
  name: string;
}

export const packageQueue = new Queue<PackageData>("package", {
  connection,
});

export interface FfmpegData {
  input: Input;
  stream: Stream;
  segmentSize: number;
  assetId: string;
}

export const ffmpegQueue = new Queue<FfmpegData>("ffmpeg", {
  connection,
});

export interface FfprobeData {
  inputs: PartialInput[];
}

export const ffprobeQueue = new Queue<FfprobeData>("ffprobe", {
  connection,
});

export type OutcomeData =
  | {
      type: "transcode";
      data: TranscodeData;
    }
  | {
      type: "package";
      data: PackageData;
    }
  | {
      type: "image";
      data: ImageData;
    };

export const outcomeQueue = new Queue<OutcomeData>("outcome", {
  connection,
});

export interface ImageData {
  assetId: string;
}

export const imageQueue = new Queue<ImageData>("image", {
  connection,
});
