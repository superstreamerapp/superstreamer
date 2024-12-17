import { Card, CardBody, CardHeader } from "@nextui-org/react";
import { DataView } from "./DataView";
import { Format } from "./Format";
import { Logs } from "./Logs";
import type { Job } from "@superstreamer/api/client";

interface JobPageProps {
  job: Job;
  logs: string[];
}

export function JobPage({ job, logs }: JobPageProps) {
  return (
    <>
      {job.failedReason ? (
        <Card className="p-4 mx-4 mt-4 text-danger">{job.failedReason}</Card>
      ) : null}
      <div className="flex flex-col w-full p-4 gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium">Created</span>
            <Format className="block" format="date" value={job.createdAt} />
          </div>
          <div>
            <span className="text-sm font-medium">Duration</span>
            <Format className="block" format="duration" value={job.duration} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <Card className="p-0">
              <CardHeader className="p-4">Input</CardHeader>
              <CardBody className="p-4 pt-0">
                <DataView data={job.inputData} />
              </CardBody>
            </Card>
            <Card className="p-0">
              <CardHeader className="p-4">Output</CardHeader>
              <CardBody className="p-4 pt-0">
                {job.outputData ? <DataView data={job.outputData} /> : null}
              </CardBody>
            </Card>
          </div>
          <div>
            <Card className="p-0">
              <CardHeader className="p-4">Logs</CardHeader>
              <CardBody className="p-4 pt-0">
                <Logs lines={logs} />
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
