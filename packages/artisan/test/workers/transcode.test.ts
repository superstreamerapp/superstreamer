import "bun";
import { describe, expect, test } from "bun:test";
import {
  getMatches,
  mergeInput,
  mergeStream,
} from "../../src/workers/transcode";

const ALL_FFPROBE_RESULT = {
  video: {
    "http://mock.com/asset.mp4": {
      height: 720,
      framerate: 24,
    },
  },
  audio: {
    "http://mock.com/asset.mp4": {
      language: "eng",
      channels: 2,
    },
  },
};

const NO_FFPROBE_RESULT = {
  video: {
    "http://mock.com/asset.mp4": {},
  },
  audio: {
    "http://mock.com/asset.mp4": {},
  },
};

describe("merge input", () => {
  test("should add probe results to input", () => {
    const input = mergeInput(
      {
        type: "video",
        path: "http://mock.com/asset.mp4",
      },
      ALL_FFPROBE_RESULT,
    );
    expect(input).toMatchSnapshot();
  });

  test("should fail when no default can be decided", () => {
    const fn = () =>
      mergeInput(
        {
          type: "video",
          path: "http://mock.com/asset.mp4",
        },
        NO_FFPROBE_RESULT,
      );
    expect(fn).toThrowError();
  });

  test("should prioritize user defined defaults", () => {
    const input = mergeInput(
      {
        type: "video",
        path: "http://mock.com/asset.mp4",
        height: 1,
        framerate: 1,
      },
      ALL_FFPROBE_RESULT,
    );
    expect(input).toMatchSnapshot();
  });
});

describe("merge stream", () => {
  test("should not match when not of the same type", () => {
    const stream = mergeStream(
      {
        type: "video",
        codec: "h264",
        height: 720,
      },
      {
        type: "text",
        path: "http://mock.com/asset.mp4",
        language: "eng",
      },
    );
    expect(stream).toBeNull();
  });

  test("should match the same type", () => {
    const stream = mergeStream(
      {
        type: "video",
        codec: "h264",
        height: 1080,
      },
      {
        type: "video",
        path: "http://mock.com/asset.mp4",
        height: 1080,
        framerate: 25,
      },
    );
    expect(stream).toMatchSnapshot();
  });

  test("should prioritize user defined stream properties and default where available", () => {
    const stream = mergeStream(
      {
        type: "video",
        codec: "h264",
        height: 480,
      },
      {
        type: "video",
        path: "http://mock.com/asset.mp4",
        height: 1080,
        framerate: 25,
      },
    );
    expect(stream).toMatchSnapshot();
  });

  test("should default audio bitrate", () => {
    const stream = mergeStream(
      {
        type: "audio",
        codec: "aac",
      },
      {
        type: "audio",
        path: "http://mock.com/asset.mp4",
        language: "nld",
        channels: 2,
      },
    );
    expect(stream).toMatchSnapshot();
  });
});

describe("get list of matches", () => {
  test("should match", () => {
    const matches = getMatches(
      [
        {
          type: "video",
          codec: "hevc",
          height: 1080,
        },
        {
          type: "video",
          codec: "h264",
          height: 720,
        },
        {
          type: "audio",
          codec: "eac3",
          channels: 100,
          bitrate: 1_000_000,
        },
        {
          type: "audio",
          codec: "ac3",
          channels: 6,
        },
        {
          type: "audio",
          codec: "aac",
          channels: 2,
          language: "eng",
        },
        {
          type: "audio",
          codec: "aac",
          language: "nld",
        },
      ],
      [
        {
          type: "video",
          path: "http://mock.com/asset.mp4",
          height: 1080,
          framerate: 25,
        },
        {
          type: "audio",
          path: "http://mock.com/asset.mp4",
          language: "eng",
          channels: 6,
        },
        {
          type: "audio",
          path: "http://mock.com/asset/audio-nld.mp4",
          language: "nld",
          channels: 2,
        },
      ],
    );
    expect(matches).toMatchSnapshot();
  });
});
