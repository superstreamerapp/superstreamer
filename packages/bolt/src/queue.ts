import { Queue } from "bullmq";
import { env } from "./env";
import type { Input, PartialInput, PartialStream, Stream } from "./types";
import type { ConnectionOptions } from "bullmq";

const connection: ConnectionOptions = {
  url: env.REDIS_URL,
};

export interface PipelineData {
  // Shared
  assetId: string;
  segmentSize: number;
  // Transcode
  inputs: PartialInput[];
  streams: PartialStream[];
  group?: string;
  // Package
  name: string;
  concurrency: number;
  public: boolean;
  language?: string;
}

export const pipelineQueue = new Queue<PipelineData>("pipeline", {
  connection,
});

export interface TranscodeData {
  assetId: string;
  segmentSize: number;
  inputs: PartialInput[];
  streams: PartialStream[];
  group?: string;
}

export const transcodeQueue = new Queue<TranscodeData>("transcode", {
  connection,
});

export interface PackageData {
  assetId: string;
  segmentSize?: number;
  name: string;
  concurrency: number;
  public: boolean;
  language?: string;
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
  };

export const outcomeQueue = new Queue<OutcomeData>("outcome", {
  connection,
});
