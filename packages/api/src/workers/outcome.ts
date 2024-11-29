import { createAsset } from "../repositories/assets";
import { createPlayable, getOrCreateGroup } from "../repositories/assets";
import type { OutcomeData, WorkerCallback } from "bolt";

export const outcomeCallback: WorkerCallback<OutcomeData> = async ({ job }) => {
  switch (job.data.type) {
    case "transcode": {
      const { data } = job.data;
      let groupId: number | undefined;
      if (data.group) {
        const group = await getOrCreateGroup(data.group);
        groupId = group.id;
      }

      await createAsset({
        id: data.assetId,
        groupId,
      });
      break;
    }
    case "package": {
      const { data } = job.data;
      await createPlayable({
        assetId: data.assetId,
        name: data.name,
      });
      break;
    }
    case "image": {
      // TODO: Store thumbnail in database.
      break;
    }
  }
};
