import { randomUUID } from "crypto";
import type { Job, JobsOptions, Queue } from "bullmq";

export const DEFAULT_SEGMENT_SIZE = 2.24;

export const DEFAULT_PACKAGE_NAME = "hls";

export async function addToQueue<Q extends Queue>(
  queue: Q,
  data: Q extends Queue<infer D> ? D : never,
  params?: {
    id?: string | string[];
    name?: string;
    options?: JobsOptions;
    parent?: Job;
  },
) {
  let jobId = params?.id;
  if (Array.isArray(jobId)) {
    jobId = jobId.join("_");
  }

  if (!jobId) {
    jobId = randomUUID();
  }

  let name = queue.name;
  if (params?.name) {
    name = `${name}(${params.name})`;
  }

  const options: JobsOptions = { ...params?.options };

  if (params?.parent?.id) {
    options.parent = {
      id: params.parent.id,
      queue: params.parent.queueQualifiedName,
    };
    options.failParentOnFailure = true;
  }

  const job = await queue.add(name, data, {
    removeOnComplete: {
      age: 60 * 10,
    },
    removeOnFail: {
      age: 3600 * 24 * 7,
    },
    ...options,
    jobId: `${queue.name}_${jobId}`,
  });

  if (!job.id) {
    throw new Error("Missing job.id");
  }

  return job.id;
}
