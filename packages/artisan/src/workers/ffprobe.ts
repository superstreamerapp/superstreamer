import { ffprobe } from "../lib/ffmpeg";
import { mapInputToPublicUrl } from "../lib/file-helpers";
import type { FfprobeData, FfprobeResult, WorkerCallback } from "bolt";

export const ffprobeCallback: WorkerCallback<
  FfprobeData,
  FfprobeResult
> = async ({ job }) => {
  const result: FfprobeResult = {
    video: {},
    audio: {},
  };

  for (const input of job.data.inputs) {
    const publicUrl = await mapInputToPublicUrl(input);
    const info = await ffprobe(publicUrl);

    if (input.type === "video") {
      const stream = info.streams.find(
        (stream) => stream.codec_type === "video",
      );

      const framerate = stream?.avg_frame_rate
        ? parseFrameRate(stream.avg_frame_rate)
        : undefined;

      result.video[input.path] = {
        height: stream?.height,
        framerate,
      };
    }

    if (input.type === "audio") {
      const stream = info.streams.find(
        (stream) => stream.codec_type === "audio",
      );

      let language = info.format.tags?.["language"];
      if (!language || typeof language === "number") {
        language = undefined;
      }

      result.audio[input.path] = {
        language,
        channels: stream?.channels,
      };
    }

    job.log(`${input.path}: ${JSON.stringify(info)}`);
  }

  return result;
};

function parseFrameRate(avg: string) {
  const fraction = avg.split("/");

  if (fraction[1]?.endsWith("|")) {
    fraction[1] = fraction[1].substring(0, fraction[1].length - 1);
  }

  if (fraction[0] && fraction[1]) {
    return +fraction[0] / +fraction[1];
  }

  if (fraction[0]) {
    return +fraction[0];
  }
}
