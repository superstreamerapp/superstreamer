import {
  addToQueue,
  imageQueue,
  packageQueue,
  transcodeQueue,
  waitForChildren,
} from "bolt";
import type { PipelineData, PipelineResult, WorkerCallback } from "bolt";
import type { Job } from "bullmq";

enum Step {
  Initial,
  Continue,
  Wait,
  Finish,
}

export const pipelineCallback: WorkerCallback<
  PipelineData & { step?: Step },
  PipelineResult
> = async ({ job, token }) => {
  let step = job.data.step ?? Step.Initial;
  while (step !== Step.Finish) {
    switch (step) {
      case Step.Initial: {
        await handleStepInitial(job);
        await job.updateData({
          ...job.data,
          step: Step.Continue,
        });
        step = Step.Continue;
        break;
      }

      case Step.Continue: {
        await handleStepContinue(job, token);
        await job.updateData({
          ...job.data,
          step: Step.Wait,
        });
        step = Step.Wait;
        break;
      }

      case Step.Wait: {
        await waitForChildren(job, token);
        await job.updateData({
          ...job.data,
          step: Step.Finish,
        });
        step = Step.Finish;
        break;
      }
    }
  }

  return {
    assetId: job.data.assetId,
  };
};

async function handleStepInitial(job: Job<PipelineData>) {
  await addToQueue(
    transcodeQueue,
    {
      assetId: job.data.assetId,
      inputs: job.data.inputs,
      streams: job.data.streams,
      group: job.data.group,
      segmentSize: job.data.segmentSize,
    },
    {
      parent: job,
    },
  );
}

async function handleStepContinue(job: Job<PipelineData>, token?: string) {
  await waitForChildren(job, token);

  await addToQueue(
    packageQueue,
    {
      assetId: job.data.assetId,
      name: job.data.name,
      language: job.data.language,
    },
    {
      parent: job,
    },
  );

  await addToQueue(
    imageQueue,
    {
      assetId: job.data.assetId,
    },
    {
      parent: job,
    },
  );
}
