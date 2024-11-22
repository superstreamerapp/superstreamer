import {
  ffmpegQueue,
  ffprobeQueue,
  flowProducer,
  imageQueue,
  outcomeQueue,
  packageQueue,
  pipelineQueue,
  transcodeQueue,
} from "bolt";
import { Job as RawJob } from "bullmq";
import { isRecordWithNumbers } from "../utils/type-guard";
import type { Job } from "../types";
import type { JobNode, JobState, Queue } from "bullmq";

const allQueus = [
  pipelineQueue,
  transcodeQueue,
  packageQueue,
  ffmpegQueue,
  ffprobeQueue,
  outcomeQueue,
  imageQueue,
];

function findQueueByName(name: string): Queue {
  const queue = allQueus.find((queue) => queue.name === name);
  if (!queue) {
    throw new Error("No queue found.");
  }
  return queue;
}

function formatIdPair(id: string): [Queue, string] {
  const queueName = id.split("_", 1)[0];
  if (!queueName) {
    throw new Error("Missing queueName as prefix when formatting id pair");
  }
  return [findQueueByName(queueName), id];
}

interface JobsFilter {
  page: number;
  perPage: number;
  sortKey: "name" | "duration" | "createdAt";
  sortDir: "asc" | "desc";
}

export async function getJobs(filter: JobsFilter) {
  let items: Job[] = [];

  for (const queue of allQueus) {
    const jobs = await queue.getJobs();

    for (const job of jobs) {
      if (!job.id || job.parent) {
        continue;
      }
      const foundJob = await getJob(job.id, false);
      if (foundJob) {
        items.push(foundJob);
      }
    }
  }

  if (filter.sortKey === "createdAt") {
    items.sort((a, b) => a.createdAt - b.createdAt);
  }

  if (filter.sortKey === "name") {
    items.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (filter.sortKey === "duration") {
    items.sort((a, b) => (a.duration ?? 0) - (b.duration ?? 0));
  }

  if (filter.sortDir === "desc") {
    items = items.reverse();
  }

  const totalPages = Math.ceil(items.length / filter.perPage);
  const index = (filter.page - 1) * filter.perPage;
  items = items.slice(index, index + filter.perPage);

  return {
    ...filter,
    items,
    totalPages,
  };
}

export async function getJob(
  id: string,
  fromRoot?: boolean,
): Promise<Job | null> {
  const node = await getJobNode(id, fromRoot);
  if (!node) {
    return null;
  }
  return await formatJobNode(node);
}

export async function getJobLogs(id: string): Promise<string[]> {
  const [queue, jobId] = formatIdPair(id);

  const { logs } = await queue.getJobLogs(jobId);

  return logs;
}

async function getJobNode(
  id: string,
  fromRoot?: boolean,
): Promise<JobNode | null> {
  const [queue, jobId] = formatIdPair(id);

  const rawJob = await RawJob.fromId(queue, jobId);

  let job = rawJob ?? null;
  if (!job) {
    return null;
  }

  if (fromRoot) {
    // If we want the root, resolve it and work with that as our job.
    job = await findRootJob(job);
  }

  if (!job?.id) {
    throw new Error("Found a child job but it has no parent.");
  }

  return await flowProducer.getFlow({
    id: job.id,
    queueName: job.queueName,
  });
}

async function findRootJob(job?: RawJob): Promise<RawJob | null> {
  if (!job) {
    return null;
  }

  while (job.parent) {
    const [queue, jobId] = formatIdPair(job.parent.id);
    const parentJob = await RawJob.fromId(queue, jobId);
    if (!parentJob) {
      throw new Error("No parent job found.");
    }
    job = parentJob;
  }

  return job;
}

async function formatJobNode(node: JobNode): Promise<Job> {
  const { job, children } = node;
  if (!job.id) {
    throw new Error("Missing job id");
  }

  const state = mapJobState(await job.getState());

  const failedReason = state === "failed" ? job.failedReason : undefined;

  const jobChildren: Job[] = [];
  if (children) {
    children.sort((a, b) => a.job.timestamp - b.job.timestamp);

    for (const child of children) {
      if (!child) {
        // Jobs can be auto removed. Skip them.
        continue;
      }
      jobChildren.push(await formatJobNode(child));
    }
  }

  let processedAt = job.processedOn;
  if (processedAt) {
    for (const jobChild of jobChildren) {
      if (
        jobChild.processedAt &&
        processedAt !== undefined &&
        jobChild.processedAt < processedAt
      ) {
        processedAt = jobChild.processedAt;
      }
    }
  }

  const duration =
    state === "completed" && processedAt && job.finishedOn
      ? job.finishedOn - processedAt
      : undefined;

  let progress: Record<string, number> | undefined;
  if (isRecordWithNumbers(job.progress)) {
    progress = job.progress;
  }

  return {
    id: job.id,
    name: job.name,
    state,
    progress,
    duration,
    processedAt: job.processedOn,
    finishedAt: job.finishedOn,
    createdAt: job.timestamp,
    inputData: JSON.stringify(job.data),
    outputData: job.returnvalue ? JSON.stringify(job.returnvalue) : undefined,
    failedReason,
    stacktrace: job.stacktrace,
    children: jobChildren,
  };
}

function mapJobState(jobState: JobState | "unknown"): Job["state"] {
  if (jobState === "active" || jobState === "waiting-children") {
    return "running";
  }
  if (jobState === "completed") {
    return "completed";
  }
  if (jobState === "failed") {
    return "failed";
  }
  return "waiting";
}
