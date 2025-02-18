import type { DateTime } from "luxon";

export interface Asset {
  url: string;
  duration: number;
}

export interface VastParams {
  url?: string;
  data?: string;
}

export interface AssetResolver {
  asset?: Asset;
  vast?: VastParams;
}

export interface TimedEvent {
  dateTime: DateTime;
  duration?: number;
  assets?: Asset[];
  vast?: VastParams;
}

export interface VmapParams {
  url: string;
}
