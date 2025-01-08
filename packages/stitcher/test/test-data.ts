import { DateTime } from "luxon";
import type { MasterPlaylist, MediaPlaylist } from "../src/parser";
import type { Session } from "../src/session";

export function fakeMasterPlaylist(): MasterPlaylist {
  return {
    renditions: [
      {
        type: "AUDIO",
        groupId: "group_1",
        name: "audio_1",
        uri: "audio.m3u8",
      },
      {
        type: "SUBTITLES",
        groupId: "group_2",
        name: "subtitles_1",
        uri: "subtitles.m3u8",
      },
    ],
    variants: [
      {
        uri: "video.m3u8",
        bandwidth: 1000,
        audio: "group_1",
        subtitles: "group_2",
      },
    ],
  };
}

export function fakeMediaPlaylistWithRelSeg(): MediaPlaylist {
  return {
    targetDuration: 2,
    endlist: true,
    segments: [
      {
        uri: "seg1.mp4",
        duration: 2,
        map: {
          uri: "init.mp4",
        },
      },
      {
        uri: "seg2.mp4",
        duration: 1.5,
      },
    ],
    dateRanges: [],
  };
}

export function fakeMediaPlaylistWithAbsSeg(): MediaPlaylist {
  return {
    targetDuration: 2,
    endlist: true,
    segments: [
      {
        uri: "https://mock-absolute.com/video_1/seg1.mp4",
        duration: 2,
        map: {
          uri: "https://mock-absolute.com/video_1/init.mp4",
        },
      },
    ],
    dateRanges: [],
  };
}

export function fakeSession(): Session {
  return {
    id: "36bab417-0952-4c23-bdf0-9a424e4651ad",
    url: "http://mock.com/master.m3u8",
    expiry: 3600,
    startTime: DateTime.now(),
    interstitials: [],
  };
}

export function addFakeInterstitials(session: Session) {
  session.interstitials = [
    {
      dateTime: session.startTime,
      chunks: [
        {
          type: "vast",
          data: { url: "https://mock.com/vast.xml" },
        },
      ],
    },
    {
      dateTime: session.startTime.plus({ seconds: 10 }),
      chunks: [
        {
          type: "vast",
          data: { data: "<CDATA>mocked VAST data</CDATA>" },
        },
      ],
    },
    // Manual bumper & ad interstitial
    {
      dateTime: session.startTime.plus({ seconds: 30 }),
      chunks: [
        {
          type: "asset",
          data: {
            url: "https://mock.com/interstitial/bumper.m3u8",
            duration: 5,
            kind: "bumper",
          },
        },
        {
          type: "asset",
          data: {
            url: "https://mock.com/interstitial/ad.m3u8",
            duration: 10,
            kind: "ad",
          },
        },
      ],
    },
  ];
}
