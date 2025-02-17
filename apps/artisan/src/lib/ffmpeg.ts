import fluent from "fluent-ffmpeg";
import { getBinaryPath } from "./file-helpers";

const ffprobeBin = await getBinaryPath("ffprobe");

console.log("ffprobeBin", ffprobeBin);
fluent.setFfprobePath(ffprobeBin);

export async function ffprobe(input: string) {
  return await new Promise<fluent.FfprobeData>((resolve, reject) => {
    fluent(input).ffprobe((err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

const ffmpegBin = await getBinaryPath("ffmpeg");

fluent.setFfmpegPath(ffmpegBin);

export async function ffmpeg(
  input: string,
  localFilePath: string,
  params: string[],
  onStart: (command: string) => void,
  onProgress: (progress: number) => void,
) {
  return await new Promise((resolve, reject) => {
    fluent(input)
      .outputOptions(params)
      .on("start", onStart)
      .on("progress", (event) => {
        if (event.percent !== undefined) {
          onProgress(event.percent);
        }
      })
      .on("error", reject)
      .on("end", resolve)
      .output(localFilePath)
      .run();
  });
}
