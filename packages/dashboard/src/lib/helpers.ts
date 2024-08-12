import prettyMs from "pretty-ms";
import * as timeAgo from "timeago.js";
import type { JobDto } from "@/lib/api";

export function getDurationStr(job: JobDto) {
  if (!job.finishedOn) {
    return null;
  }
  const duration = job.finishedOn - (job.processedOn ?? 0);
  return prettyMs(duration);
}

export function getShortId(prefixedId: string) {
  const [_, id] = prefixedId.split("_");
  return id.substring(0, 7);
}

export function getTimeAgo(value: number | null) {
  if (!value) {
    return null;
  }
  return timeAgo.format(value);
}