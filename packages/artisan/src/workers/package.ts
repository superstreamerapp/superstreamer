import { addToQueue, outcomeQueue } from "bolt";
import { execa } from "execa";
import parseFilePath from "parse-filepath";
import { getBinaryPath, getMetaStruct } from "../lib/file-helpers";
import { syncFromS3, syncToS3 } from "../lib/s3";
import type {
  PackageData,
  PackageResult,
  Stream,
  WorkerCallback,
  WorkerDir,
} from "bolt";
import type { Job } from "bullmq";

const packagerBin = await getBinaryPath("packager");

enum Step {
  Initial,
  Outcome,
  Finish,
}

export const packageCallback: WorkerCallback<
  PackageData & { step?: Step },
  PackageResult
> = async ({ job, dir }) => {
  let step = job.data.step ?? Step.Initial;
  while (step !== Step.Finish) {
    switch (step) {
      case Step.Initial: {
        await handleStepInitial(job, dir);
        await job.updateData({
          ...job.data,
          step: Step.Outcome,
        });
        step = Step.Outcome;
        break;
      }

      case Step.Outcome: {
        await handleJobOutcome(job);
        await job.updateData({
          ...job.data,
          step: Step.Finish,
        });
        step = Step.Finish;
        break;
      }
    }
  }

  return {
    assetId: job.data.assetId,
  };
};

async function handleStepInitial(job: Job<PackageData>, dir: WorkerDir) {
  const inDir = await dir.createTempDir();

  await syncFromS3(`transcode/${job.data.assetId}`, inDir);

  job.log(`Synced folder in ${inDir}`);

  const meta = await getMetaStruct(inDir);

  job.log(`Got meta: "${JSON.stringify(meta)}"`);

  // If we do not specify the segmentSize, grab it from the meta file.
  const segmentSize = job.data.segmentSize ?? meta.segmentSize;

  const outDir = await dir.createTempDir();

  const packagerParams: string[][] = [];

  const entries = Object.entries(meta.streams);
  entries.forEach(([key, stream]) => {
    const file = parseFilePath(key);

    if (stream.type === "video") {
      packagerParams.push([
        `in=${inDir}/${key}`,
        "stream=video",
        `init_segment=${file.name}/init.mp4`,
        `segment_template=${file.name}/$Number$.m4s`,
        `playlist_name=${file.name}/playlist.m3u8`,
        `iframe_playlist_name=${file.name}/iframe.m3u8`,
      ]);
    }

    if (stream.type === "audio") {
      const params = [
        `in=${inDir}/${key}`,
        "stream=audio",
        `init_segment=${file.name}/init.mp4`,
        `segment_template=${file.name}/$Number$.m4a`,
        `playlist_name=${file.name}/playlist.m3u8`,
        `hls_group_id=${getGroupId(stream)}`,
        `hls_name=${getName(stream)}`,
      ];

      if (stream.language !== "und") {
        // TODO: We should use getLangCode here to figure out if we can pass a valid
        // iso str, and leave it as-is when it is null.
        params.push(`language=${stream.language}`);
      }

      packagerParams.push(params);
    }

    if (stream.type === "text") {
      packagerParams.push([
        `in=${inDir}/${key}`,
        "stream=text",
        `segment_template=${file.name}/$Number$.vtt`,
        `playlist_name=${file.name}/playlist.m3u8`,
        `hls_group_id=${getGroupId(stream)}`,
        `hls_name=${getName(stream)}`,
        `language=${stream.language}`,
      ]);
    }
  });

  const packagerArgs = packagerParams.map((it) => `${it.join(",")}`);

  if (job.data.language) {
    packagerArgs.push("--default_language", job.data.language);
  }

  packagerArgs.push(
    "--segment_duration",
    segmentSize.toString(),
    "--fragment_duration",
    segmentSize.toString(),
    "--hls_master_playlist_output",
    "master.m3u8",
  );

  job.log(packagerArgs.join("\n"));

  await execa(packagerBin, packagerArgs, {
    stdio: "inherit",
    cwd: outDir,
    detached: false,
  });

  const s3Dir = `package/${job.data.assetId}/${job.data.name}`;
  job.log(`Uploading to ${s3Dir}`);

  await syncToS3(outDir, s3Dir, {
    del: true,
    public: true,
  });
}

async function handleJobOutcome(job: Job<PackageData>) {
  await addToQueue(
    outcomeQueue,
    {
      type: "package",
      data: job.data,
    },
    {
      options: {
        removeOnComplete: true,
      },
    },
  );
}

function getGroupId(
  stream:
    | Extract<Stream, { type: "audio" }>
    | Extract<Stream, { type: "text" }>,
) {
  if (stream.type === "audio") {
    // When we package audio, we split codecs into a separate group.
    // The CODECS attribute would else include "ac-3,mp4a.40.2", which will
    // make HLS players fail as each CODECS attribute is needs to pass the
    // method |isTypeSupported| on MSE.
    return `audio_${stream.codec}`;
  }
  if (stream.type === "text") {
    return `text`;
  }
}

function getName(
  stream:
    | Extract<Stream, { type: "audio" }>
    | Extract<Stream, { type: "text" }>,
) {
  if (stream.type === "audio") {
    return `${stream.language}_${stream.codec}`;
  }
  if (stream.type === "text") {
    return `${stream.language}`;
  }
}
