import type { AudioCodec, VideoCodec } from "bolt";

const DEFAULT_AUDIO_BITRATE: Record<number, Record<AudioCodec, number>> = {
  2: {
    aac: 128000,
    ac3: 192000,
    eac3: 96000,
  },
  6: {
    aac: 256000,
    ac3: 384000,
    eac3: 192000,
  },
};

export function getDefaultAudioBitrate(channels: number, codec: AudioCodec) {
  return DEFAULT_AUDIO_BITRATE[channels]?.[codec] ?? null;
}

const DEFAULT_VIDEO_BITRATE: Record<number, Record<VideoCodec, number>> = {
  144: {
    h264: 108000,
    hevc: 96000,
    vp9: 96000,
  },
  240: {
    h264: 242000,
    hevc: 151000,
    vp9: 151000,
  },
  360: {
    h264: 400000,
    hevc: 277000,
    vp9: 277000,
  },
  480: {
    h264: 1000000,
    hevc: 512000,
    vp9: 512000,
  },
  720: {
    h264: 2000000,
    hevc: 1000000,
    vp9: 1000000,
  },
  1080: {
    h264: 4000000,
    hevc: 2000000,
    vp9: 2000000,
  },
  1440: {
    h264: 9000000,
    hevc: 6000000,
    vp9: 6000000,
  },
  2160: {
    h264: 17000000,
    hevc: 12000000,
    vp9: 12000000,
  },
};

export function getDefaultVideoBitrate(height: number, codec: VideoCodec) {
  return DEFAULT_VIDEO_BITRATE[height]?.[codec] ?? null;
}
