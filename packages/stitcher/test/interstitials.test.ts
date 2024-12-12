import { describe, expect, spyOn, test } from "bun:test";
import { DateTime } from "luxon";
import { addFakeInterstitials, fakeSession } from "./test-data";
import { getAssets, getStaticDateRanges } from "../src/interstitials";

describe("getStaticDateRanges", () => {
  test("should create dateRanges for vod", () => {
    const session = fakeSession();
    addFakeInterstitials(session);

    const isLive = false;
    const dateRanges = getStaticDateRanges(session, isLive);

    expect(dateRanges).toMatchSnapshot();
  });

  test("should create dateRanges for live", () => {
    const session = fakeSession();
    addFakeInterstitials(session);

    const isLive = true;
    const dateRanges = getStaticDateRanges(session, isLive);

    expect(dateRanges).toMatchSnapshot();
  });
});

describe("getAssets", () => {
  test("should get assets by interstitials", async () => {
    const session = fakeSession();
    const dateTime = DateTime.now();

    const spy = spyOn(await import("../src/vast"), "getAssetsFromVast");
    spy.mockReturnValueOnce(
      Promise.resolve([
        {
          url: "https://mock.com/ad_1/master.m3u8",
          duration: 25,
        },
      ]),
    );

    session.interstitials = [
      {
        dateTime,
        assets: [
          {
            url: "https://mock.com/interstitial1/master.m3u8",
            kind: "ad",
          },
        ],
        vast: {
          url: "https://mock.com/vast.xml",
        },
      },
    ];

    const assets = await getAssets(session, dateTime);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(assets).toMatchSnapshot();

    spy.mockRestore();
  });
});
