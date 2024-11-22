import { randomUUID } from "crypto";
import {
  addToQueue,
  DEFAULT_PACKAGE_NAME,
  DEFAULT_SEGMENT_SIZE,
  imageQueue,
  packageQueue,
  pipelineQueue,
  transcodeQueue,
} from "bolt";
import { AudioCodec, VideoCodec } from "bolt";
import { Elysia, t } from "elysia";
import { auth } from "../auth";
import { DeliberateError } from "../errors";
import { getJob, getJobLogs, getJobs } from "../repositories/jobs";
import { JobSchema } from "../types";
import { mergeProps } from "../utils/type-guard";

const InputSchema = t.Union([
  t.Object({
    type: t.Literal("video"),
    path: t.String({
      description: "The source path, starting with http(s):// or s3://",
    }),
    height: t.Optional(t.Number()),
  }),
  t.Object({
    type: t.Literal("audio"),
    path: t.String({
      description: "The source path, starting with http(s):// or s3://",
    }),
    language: t.Optional(t.String()),
    channels: t.Optional(t.Number()),
  }),
  t.Object({
    type: t.Literal("text"),
    path: t.String({
      description: "The source path, starting with http(s):// or s3://",
    }),
    language: t.String(),
  }),
]);

const StreamSchema = t.Union([
  t.Object({
    type: t.Literal("video"),
    codec: t.Enum(VideoCodec),
    height: t.Number(),
    bitrate: t.Optional(t.Number({ description: "Bitrate in bps" })),
    framerate: t.Optional(t.Number({ description: "Frames per second" })),
  }),
  t.Object({
    type: t.Literal("audio"),
    codec: t.Enum(AudioCodec),
    bitrate: t.Optional(t.Number({ description: "Bitrate in bps" })),
    language: t.Optional(t.String()),
    channels: t.Optional(t.Number()),
  }),
  t.Object({
    type: t.Literal("text"),
    language: t.String(),
  }),
]);

export const jobs = new Elysia()
  .use(auth({ user: true, service: true }))
  .post(
    "/pipeline",
    async ({ body }) => {
      const data = {
        assetId: randomUUID(),
        segmentSize: DEFAULT_SEGMENT_SIZE,
        name: DEFAULT_PACKAGE_NAME,
        ...body,
      };
      const jobId = await addToQueue(pipelineQueue, data, {
        id: data.assetId,
      });
      return { jobId };
    },
    {
      detail: {
        summary: "Create pipeline job",
        tags: ["Jobs"],
      },
      body: t.Object({
        inputs: t.Array(InputSchema),
        streams: t.Array(StreamSchema),
        assetId: t.Optional(
          t.String({
            format: "uuid",
          }),
        ),
        group: t.Optional(t.String()),
        language: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          jobId: t.String(),
        }),
      },
    },
  )
  .post(
    "/transcode",
    async ({ body }) => {
      const data = {
        assetId: randomUUID(),
        segmentSize: DEFAULT_SEGMENT_SIZE,
        ...body,
      };
      const jobId = await addToQueue(transcodeQueue, data, {
        id: data.assetId,
      });
      return { jobId };
    },
    {
      detail: {
        summary: "Create transcode job",
        tags: ["Jobs"],
      },
      body: t.Object({
        inputs: t.Array(InputSchema),
        streams: t.Array(StreamSchema),
        assetId: t.Optional(
          t.String({
            format: "uuid",
          }),
        ),
        segmentSize: t.Optional(t.Number()),
        group: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          jobId: t.String(),
        }),
      },
    },
  )
  .post(
    "/package",
    async ({ body }) => {
      const data = {
        name: DEFAULT_PACKAGE_NAME,
        ...body,
      };
      const jobId = await addToQueue(packageQueue, data, {
        id: [data.assetId, data.name],
      });
      return { jobId };
    },
    {
      detail: {
        summary: "Create package job",
        tags: ["Jobs"],
      },
      body: t.Object({
        assetId: t.String({
          format: "uuid",
        }),
        name: t.Optional(t.String()),
        segmentSize: t.Optional(t.Number()),
        language: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          jobId: t.String(),
        }),
      },
    },
  )
  .post(
    "/image",
    async ({ body }) => {
      const jobId = await addToQueue(imageQueue, body, {
        id: body.assetId,
      });
      return { jobId };
    },
    {
      detail: {
        summary: "Create image job",
        tags: ["Jobs"],
      },
      body: t.Object({
        assetId: t.String({
          format: "uuid",
        }),
      }),
      response: {
        200: t.Object({
          jobId: t.String(),
        }),
      },
    },
  )
  .get(
    "/jobs",
    async ({ query }) => {
      const filter = mergeProps(query, {
        page: 1,
        perPage: 20,
        sortKey: "createdAt",
        sortDir: "desc",
      });
      return await getJobs(filter);
    },
    {
      detail: {
        summary: "Get all jobs",
        tags: ["Jobs"],
      },
      query: t.Object({
        page: t.Optional(t.Number()),
        perPage: t.Optional(t.Number()),
        sortKey: t.Optional(
          t.Union([
            t.Literal("name"),
            t.Literal("duration"),
            t.Literal("createdAt"),
          ]),
        ),
        sortDir: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
      }),
      response: {
        200: t.Object({
          page: t.Number(),
          perPage: t.Number(),
          sortKey: t.Union([
            t.Literal("name"),
            t.Literal("duration"),
            t.Literal("createdAt"),
          ]),
          sortDir: t.Union([t.Literal("asc"), t.Literal("desc")]),
          items: t.Array(JobSchema),
          totalPages: t.Number(),
        }),
      },
    },
  )
  .get(
    "/jobs/:id",
    async ({ params, query }) => {
      const job = await getJob(params.id, query.fromRoot);
      if (!job) {
        throw new DeliberateError({ type: "ERR_NOT_FOUND" });
      }
      return job;
    },
    {
      detail: {
        summary: "Get a job",
        tags: ["Jobs"],
      },
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        fromRoot: t.Optional(t.Boolean()),
      }),
      response: {
        200: JobSchema,
      },
    },
  )
  .get(
    "/jobs/:id/logs",
    async ({ params }) => {
      return await getJobLogs(params.id);
    },
    {
      detail: {
        summary: "Get job logs",
        tags: ["Jobs"],
      },
      params: t.Object({
        id: t.String(),
      }),
      response: {
        200: t.Array(t.String()),
      },
    },
  );
