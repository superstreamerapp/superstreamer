import type { DateTime } from "luxon";

export interface Asset {
  url: string;
  duration: number;
}

export interface VastParams {
  data?: string;
  url?: string;
}

export interface VmapParams {
  url: string;
}

export interface TimedEvent {
  dateTime: DateTime;
  maxDuration?: number;
  assets?: Asset[];
  vast?: VastParams;
}
