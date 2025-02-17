import { WaitingChildrenError, Worker } from "bullmq";
import { assert } from "shared/assert";
import { env } from "./env";
import { WorkerDir } from "./lib/worker-dir";
import { WorkerProgressTracker } from "./lib/worker-progress-tracker";
import type { ConnectionOptions, Job } from "bullmq";
export type { WorkerDir } from "./lib/worker-dir";

const connection: ConnectionOptions = {
  url: env.REDIS_URL,
};

export function runWorkers(
  definitions: {
    name: string;
    callback: WorkerCallback;
  }[],
) {
  const workers = definitions.map((definition) => {
    const { name, callback } = definition;
    const processor = createWorkerProcessor(callback);

    const worker = new Worker(name, processor, {
      connection,
      autorun: false,
    });

    worker.on("error", (failedReason) => {
      // Pretty print the error for debug reasons.
      console.dir(failedReason);
    });

    return worker;
  });

  const gracefulShutdown = async () => {
    for (const worker of workers) {
      if (!worker.isRunning()) {
        continue;
      }
      // Pass true to force worker to close. Does not wait for workers
      // to finish first.
      await worker.close(true);
    }
    process.exit(0);
  };

  process
    .on("beforeExit", gracefulShutdown)
    .on("SIGINT", gracefulShutdown)
    .on("SIGTERM", gracefulShutdown);

  workers.forEach((worker) => {
    worker.run();
    console.log(`Started worker "${worker.name}"`);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WorkerCallback<T = any, R = any> = (params: {
  job: Job<T, R>;
  token: string | undefined;
  dir: WorkerDir;
  progressTracker: WorkerProgressTracker;
}) => Promise<R>;

function createWorkerProcessor<T, R>(callback: WorkerCallback<T, R>) {
  return async (job: Job<T, R>, token?: string) => {
    const dir = new WorkerDir();
    const progressTracker = new WorkerProgressTracker(job);

    try {
      return await callback({ job, token, dir, progressTracker });
    } finally {
      await progressTracker.finish();
      await dir.deleteAll();
    }
  };
}

export async function waitForChildren(job: Job, token?: string) {
  assert(token);
  const shouldWait = await job.moveToWaitingChildren(token);
  if (shouldWait) {
    throw new WaitingChildrenError();
  }
}

export async function getChildren<T>(job: Job, name: string) {
  const childrenValues = await job.getChildrenValues();
  const entries = Object.entries(childrenValues);

  return entries.reduce<T[]>((acc, [key, value]) => {
    if (!key.startsWith(`bull:${name}`)) {
      return acc;
    }
    acc.push(value as T);
    return acc;
  }, []);
}
