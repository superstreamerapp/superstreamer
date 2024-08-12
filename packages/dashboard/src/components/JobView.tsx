import { getTimeAgo } from "@/lib/helpers";
import { JobActions } from "./JobActions";
import type { JobDto } from "@/lib/api";

type JobViewProps = {
  job: JobDto;
};

export function JobView({ job }: JobViewProps) {
  return (
    <>
      <JobActions job={job} />
      <div className="grid grid-cols-3 gap-2 w-full mb-4">
        <div>
          <div className="text-sm font-medium">Created</div>
          {getTimeAgo(job.createdOn)}
        </div>
        <div>
          <div className="text-sm font-medium">Started</div>
          {getTimeAgo(job.processedOn) ?? "N/A"}
        </div>
        <div>
          <div className="text-sm font-medium">Finished</div>
          {getTimeAgo(job.finishedOn) ?? "N/A"}
        </div>
      </div>
      <div className="mb-4">
        <div className="mb-2">Input</div>
        <Format data={job.inputData} />
      </div>
      <div>
        <div className="mb-2">Output</div>
        <Format data={job.outputData} />
      </div>
    </>
  );
}

function Format({ data }: { data: string | null }) {
  let parsedData: unknown;
  try {
    if (data) {
      parsedData = JSON.parse(data);
    }
  } catch {}

  return parsedData ? (
    <pre className="p-2 text-xs border border-border rounded-md">
      {JSON.stringify(parsedData, null, 2)}
    </pre>
  ) : null;
}