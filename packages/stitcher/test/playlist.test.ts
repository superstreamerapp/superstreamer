import { describe, expect, test } from "bun:test";
import {
  fakeMasterPlaylist,
  fakeMediaPlaylistWithAbsSeg,
  fakeMediaPlaylistWithRelSeg,
  fakeSession,
} from "./test-data";
import {
  createMasterUrl,
  mapAdBreaksToSessionInterstitials,
  rewriteMasterPlaylistUrls,
  rewriteMediaPlaylistUrls,
} from "../src/playlist";

describe("rewriteMasterPlaylistUrls", () => {
  test("should rewrite", () => {
    const master = fakeMasterPlaylist();

    rewriteMasterPlaylistUrls(master, {
      origUrl: "http://mock.com/master.m3u8",
    });

    expect(master).toMatchSnapshot();
  });

  test("should include session id", () => {
    const master = fakeMasterPlaylist();
    const session = fakeSession();

    rewriteMasterPlaylistUrls(master, {
      origUrl: "http://mock.com/master.m3u8",
      session,
    });

    expect(master).toMatchSnapshot();
  });
});

describe("rewriteMediaPlaylistUrls", () => {
  test("should rewrite relative segments", () => {
    const media = fakeMediaPlaylistWithRelSeg();

    rewriteMediaPlaylistUrls(media, "https://mock.com/video_1.m3u8");

    expect(media).toMatchSnapshot();
  });

  test("should rewrite absolute segments", () => {
    const media = fakeMediaPlaylistWithAbsSeg();

    rewriteMediaPlaylistUrls(media, "https://mock.com/video_2.m3u8");

    expect(media).toMatchSnapshot();
  });
});

describe("mapAdBreaksToSessionInterstitials", () => {
  test("should handle time based with vastUrl", () => {
    const session = fakeSession();

    const interstitials = mapAdBreaksToSessionInterstitials(session, [
      {
        timeOffset: "start",
        vastUrl: "http://mock.com/vast_1.xml",
      },
      {
        timeOffset: "00:00:15.000",
        vastUrl: "http://mock.com/vast_2.xml",
      },
      {
        timeOffset: "00:00:25",
        vastUrl: "http://mock.com/vast_3.xml",
      },
    ]);

    expect(interstitials).toMatchSnapshot();
  });

  test("should handle vastData", () => {
    const session = fakeSession();

    const interstitials = mapAdBreaksToSessionInterstitials(session, [
      {
        timeOffset: "00:00:10.000",
        vastData: "<CDATA>mocked VAST data</CDATA>",
      },
    ]);

    expect(interstitials).toMatchSnapshot();
  });
});

describe("createMasterUrl", () => {
  test("should create by default", () => {
    const result = createMasterUrl({
      url: "https://mock.com/master.m3u8",
    });

    // When we provide no session, we have no short url in the form of /sessionId/master.m3u8
    expect(result.url).toBeUndefined();

    expect(result.outUrl).toBe(
      "stitcher-endpoint/out/master.m3u8?eurl=MDcxZDFiMTAwNDQ4NWE0YzEyMWQwZTA3NWIwZTBjMDM0YzA1MWUwNDFiMWIxZjVjMDI1MDFhNGM%3D",
    );
  });

  test("should create with session", () => {
    const session = fakeSession();

    const result = createMasterUrl({
      url: "https://mock.com/master.m3u8",
      session,
    });

    expect(result.url).toBe(
      "stitcher-endpoint/session/36bab417-0952-4c23-bdf0-9a424e4651ad/master.m3u8",
    );

    expect(result.outUrl).toBe(
      "stitcher-endpoint/out/master.m3u8?eurl=MDcxZDFiMTAwNDQ4NWE0YzEyMWQwZTA3NWIwZTBjMDM0YzA1MWUwNDFiMWIxZjVjMDI1MDFhNGM%3D&sid=36bab417-0952-4c23-bdf0-9a424e4651ad",
    );
  });
});
