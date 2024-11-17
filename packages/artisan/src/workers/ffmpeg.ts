import { ffmpeg } from "../lib/ffmpeg";
import { mapInputToPublicUrl } from "../lib/file-helpers";
import { uploadToS3 } from "../lib/s3";
import type { FfmpegData, FfmpegResult, Stream, WorkerCallback } from "bolt";

export const ffmpegCallback: WorkerCallback<FfmpegData, FfmpegResult> = async ({
  job,
  dir,
  progressTracker,
}) => {
  let name: string | undefined;
  const outputOptions: string[] = [];

  const { stream } = job.data;

  if (stream.type === "video") {
    name = `video_${stream.height}_${stream.bitrate}_${stream.codec}.m4v`;
    outputOptions.push(...getVideoOutputOptions(stream, job.data.segmentSize));
  }

  if (stream.type === "audio") {
    name = `audio_${stream.language}_${stream.bitrate}_${stream.codec}.m4a`;
    outputOptions.push(...getAudioOutputOptions(stream, job.data.segmentSize));
  }

  if (stream.type === "text") {
    name = `text_${stream.language}.vtt`;
    outputOptions.push(...getTextOutputOptions());
  }

  if (!name) {
    throw new Error(
      "Missing name, this is most likely a bug. Report it, please.",
    );
  }

  job.log(`Transcode to ${name}`);

  const publicUrl = await mapInputToPublicUrl(job.data.input);

  const outDir = await dir.createTempDir();
  await ffmpeg(
    publicUrl,
    `${outDir}/${name}`,
    outputOptions,
    (command) => {
      job.log(command);
    },
    (value) => {
      progressTracker.set("transcode", value);
    },
  );

  job.log(
    `Uploading ${outDir}/${name} to transcode/${job.data.assetId}/${name}`,
  );

  await uploadToS3(
    `transcode/${job.data.assetId}/${name}`,
    {
      type: "local",
      path: `${outDir}/${name}`,
    },
    (value) => {
      progressTracker.set("upload", value);
    },
  );

  return {
    name,
    stream: job.data.stream,
  };
};

function getVideoOutputOptions(
  stream: Extract<Stream, { type: "video" }>,
  segmentSize: number,
) {
  const keyFrameRate = segmentSize * stream.framerate;

  const args: string[] = [
    "-f mp4",
    "-an",
    `-c:v ${stream.codec}`,
    `-b:v ${stream.bitrate}`,
    `-r ${stream.framerate}`,
    "-movflags +frag_keyframe",
    `-frag_duration ${segmentSize * 1_000_000}`,
    `-keyint_min ${keyFrameRate}`,
    `-g ${keyFrameRate}`,
  ];

  if (stream.codec === "h264") {
    let profile = "main";
    if (stream.height >= 720) {
      profile = "high";
    }
    args.push(`-profile:v ${profile}`);
  }

  if (stream.codec === "h264" || stream.codec === "hevc") {
    args.push(
      "-preset slow",
      "-flags +loop",
      "-pix_fmt yuv420p",
      "-flags +cgop",
    );
  }

  const filters: string[] = ["setsar=1:1", `scale=-2:${stream.height}`];

  if (filters.length) {
    args.push(`-vf ${filters.join(",")}`);
  }

  return args;
}

function getAudioOutputOptions(
  stream: Extract<Stream, { type: "audio" }>,
  segmentSize: number,
) {
  const args: string[] = [
    "-vn",
    `-ac ${stream.channels ?? 2}`,
    `-c:a ${stream.codec ?? 'acc'}`,
    `-b:a ${stream.bitrate ?? '256k'}`,
    `-frag_duration ${segmentSize * 1_000_000}`,
    `-metadata language=${stream.language ?? 'eng'}`,
    "-strict experimental",
  ];

  const filters: string[] = [];
  if (stream.channels === 6) {
    filters.push("channelmap=channel_layout=5.1");
  }

  if (filters.length) {
    args.push(`-af ${filters.join(",")}`);
  }

  return args;
}

function getTextOutputOptions() {
  const args: string[] = ["-f webvtt"];
  return args;
}
