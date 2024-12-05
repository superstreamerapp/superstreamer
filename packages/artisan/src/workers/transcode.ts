import {
  addToQueue,
  ffmpegQueue,
  ffprobeQueue,
  getChildren,
  outcomeQueue,
  waitForChildren,
} from "bolt";
import { by639_2T } from "iso-language-codes";
import { assert } from "shared/assert";
import {
  getDefaultAudioBitrate,
  getDefaultVideoBitrate,
} from "../lib/default-values";
import { uploadToS3 } from "../lib/s3";
import type { MetaStruct } from "../lib/file-helpers";
import type {
  FfmpegResult,
  FfprobeResult,
  Input,
  PartialInput,
  PartialStream,
  Stream,
  TranscodeData,
  TranscodeResult,
  WorkerCallback,
} from "bolt";
import type { Job } from "bullmq";

enum Step {
  Initial,
  Ffmpeg,
  Meta,
  Outcome,
  Finish,
}

export const transcodeCallback: WorkerCallback<
  TranscodeData & { step?: Step },
  TranscodeResult
> = async ({ job, token }) => {
  let step = job.data.step ?? Step.Initial;
  while (step !== Step.Finish) {
    switch (step) {
      case Step.Initial: {
        await handleStepInitial(job);
        await job.updateData({
          ...job.data,
          step: Step.Ffmpeg,
        });
        step = Step.Ffmpeg;
        break;
      }

      case Step.Ffmpeg: {
        await handleStepFfmpeg(job, token);
        await job.updateData({
          ...job.data,
          step: Step.Meta,
        });
        step = Step.Meta;
        break;
      }

      case Step.Meta: {
        await handleStepMeta(job, token);
        await job.updateData({
          ...job.data,
          step: Step.Outcome,
        });
        step = Step.Outcome;
        break;
      }

      case Step.Outcome: {
        await handleStepOutcome(job);
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

async function handleStepInitial(job: Job<TranscodeData>) {
  assert(job.id);

  const inputs = job.data.inputs.filter(
    (input) => input.type === "video" || input.type === "audio",
  );

  await addToQueue(ffprobeQueue, { inputs }, { parent: job });
}

async function handleStepFfmpeg(job: Job<TranscodeData>, token?: string) {
  await waitForChildren(job, token);

  const [probeResult] = await getChildren<FfprobeResult>(job, "ffprobe");
  assert(probeResult);

  const inputs = mergeInputs(job.data.inputs, probeResult);

  const matches = getMatches(job.data.streams, inputs);

  for (const [type, stream, input] of matches) {
    assert(job.id);

    job.log(
      `Matched ${type}: ${JSON.stringify(stream)} / ${JSON.stringify(input)}`,
    );

    const nameParams: string[] = [stream.type];
    if (stream.type === "video") {
      nameParams.push(stream.height.toString());
    }
    if (stream.type === "audio" || stream.type === "text") {
      nameParams.push(stream.language);
    }
    const name = nameParams.join(",");

    await addToQueue(
      ffmpegQueue,
      {
        input,
        stream,
        segmentSize: job.data.segmentSize,
        assetId: job.data.assetId,
      },
      {
        name,
        parent: job,
      },
    );

    // Make sure timestamp is increased.
    await Bun.sleep(1);
  }
}

async function handleStepMeta(job: Job<TranscodeData>, token?: string) {
  await waitForChildren(job, token);

  const children = await getChildren<FfmpegResult>(job, "ffmpeg");

  const streams = children.reduce<Record<string, Stream>>((acc, child) => {
    acc[child.name] = child.stream;
    return acc;
  }, {});

  const meta: MetaStruct = {
    version: 1,
    streams,
    segmentSize: job.data.segmentSize,
  };

  await job.log(`Writing meta.json (${JSON.stringify(meta)})`);

  await uploadToS3(`transcode/${job.data.assetId}/meta.json`, {
    type: "json",
    data: meta,
  });
}

async function handleStepOutcome(job: Job<TranscodeData>) {
  await addToQueue(
    outcomeQueue,
    {
      type: "transcode",
      data: job.data,
    },
    {
      options: {
        removeOnComplete: true,
      },
    },
  );
}

type MixedMatch<
  S extends { type: Stream["type"] },
  I extends { type: S["type"] },
  T extends S["type"] = "video" | "audio" | "text",
> = T extends S["type"]
  ? [T, Extract<S, { type: T }>, Extract<I, { type: T }>]
  : never;

type Match = MixedMatch<Stream, Input>;

export function mergeStream(
  partial: PartialStream,
  input: Input,
): Stream | null {
  if (partial.type === "video" && input.type === "video") {
    const framerate = partial.framerate ?? input.framerate;

    const bitrate =
      partial.bitrate ?? getDefaultVideoBitrate(partial.height, partial.codec);

    assert(bitrate, defaultReason("video", "bitrate"));

    return {
      ...partial,
      bitrate,
      framerate,
    };
  }

  if (partial.type === "audio" && input.type === "audio") {
    const channels = partial.channels ?? input.channels;

    const bitrate =
      partial.bitrate ?? getDefaultAudioBitrate(channels, partial.codec);

    const language = partial.language ?? input.language;

    assert(bitrate, defaultReason("audio", "bitrate"));

    return {
      ...partial,
      language,
      bitrate,
      channels,
    };
  }

  if (partial.type === "text" && input.type === "text") {
    return { ...partial };
  }

  return null;
}

export function getMatches(
  partials: PartialStream[],
  inputs: Input[],
): Match[] {
  return partials.reduce<Match[]>((acc, partial) => {
    inputs.forEach((input) => {
      const stream = mergeStream(partial, input);
      if (!stream) {
        return;
      }

      // We'll only have merge stream when types match, thus we know
      // for sure stream and input are aligned here.
      const match = [stream.type, stream, input] as Match;

      if (shouldSkipMatch(match)) {
        return;
      }

      acc.push(match);
    });

    return acc;
  }, []);
}

function shouldSkipMatch(match: Match) {
  const [type, stream, input] = match;
  if (type === "video") {
    if (stream.height > input.height) {
      return true;
    }
  }

  if (type === "audio") {
    if (stream.language !== input.language) {
      return true;
    }

    if (stream.channels > input.channels) {
      return true;
    }
  }

  if (type === "text") {
    if (stream.language !== input.language) {
      return true;
    }
  }

  return false;
}

function mergeInputs(
  partials: PartialInput[],
  probeResult: FfprobeResult,
): Input[] {
  return partials.map((partial) => mergeInput(partial, probeResult));
}

export function mergeInput(
  partial: PartialInput,
  probeResult: FfprobeResult,
): Input {
  if (partial.type === "video") {
    const info = probeResult.video[partial.path];
    assert(info);

    const height = partial.height ?? info.height;
    assert(height, defaultReason("video", "height"));

    const framerate = partial.framerate ?? info.framerate;
    assert(framerate, defaultReason("video", "framerate"));

    return {
      type: "video",
      path: partial.path,
      height,
      framerate,
    };
  }

  if (partial.type === "audio") {
    const info = probeResult.audio[partial.path];
    assert(info);

    // Get the language code, if not found, we fallback to undecided.
    const language = partial.language ?? getLangCode(info.language) ?? "und";

    // Assume when no channel metadata is found, we'll fallback to 2.
    const channels = partial.channels ?? info.channels ?? 2;

    return {
      type: "audio",
      path: partial.path,
      language,
      channels,
    };
  }

  if (partial.type === "text") {
    return partial;
  }

  throw new Error("Cannot merge input, invalid type.");
}

function defaultReason<T extends Stream["type"]>(
  type: T,
  prop: keyof Extract<Stream, { type: T }>,
) {
  return (
    `Could not extract a default value for "${type}" "${prop.toString()}", ` +
    "You will have to provide it in the stream instead."
  );
}

function getLangCode(value?: string) {
  if (value && value in by639_2T) {
    return value;
  }
  return null;
}
