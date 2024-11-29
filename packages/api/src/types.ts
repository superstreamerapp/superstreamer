import { t } from "elysia";
import type { Static } from "elysia";

export const JobSchema = t.Recursive(
  (This) =>
    t.Object({
      id: t.String(),
      name: t.String(),
      state: t.Union([
        t.Literal("waiting"),
        t.Literal("running"),
        t.Literal("failed"),
        t.Literal("completed"),
      ]),
      progress: t.Optional(t.Record(t.String(), t.Number())),
      createdAt: t.Number(),
      processedAt: t.Optional(t.Number()),
      finishedAt: t.Optional(t.Number()),
      duration: t.Optional(t.Number()),
      inputData: t.String(),
      outputData: t.Optional(t.String()),
      failedReason: t.Optional(t.String()),
      stacktrace: t.Optional(t.Array(t.String())),
      children: t.Array(This),
    }),
  { $id: "#/components/schemas/Job" },
);

export type Job = Static<typeof JobSchema>;

export const StorageFolderItemSchema = t.Union(
  [
    t.Object({
      type: t.Literal("file"),
      path: t.String(),
      size: t.Number({ description: "Size in bytes" }),
    }),
    t.Object({
      type: t.Literal("folder"),
      path: t.String(),
    }),
  ],
  { $id: "#/components/schemas/StorageFolderItem" },
);

export type StorageFolderItem = Static<typeof StorageFolderItemSchema>;

export const StorageFolderSchema = t.Object(
  {
    cursor: t.Optional(t.String()),
    items: t.Array(StorageFolderItemSchema),
  },
  { $id: "#/components/schemas/StorageFolder" },
);

export type StorageFolder = Static<typeof StorageFolderSchema>;

export const StorageFileSchema = t.Union([
  t.Object({
    mode: t.Literal("url"),
    type: t.Union([t.Literal("video"), t.Literal("image"), t.Literal("audio")]),
    url: t.String(),
  }),
  t.Object({
    mode: t.Literal("payload"),
    payload: t.String(),
  }),
]);

export type StorageFile = Static<typeof StorageFileSchema>;

export const UserSchema = t.Object(
  {
    id: t.Number(),
    username: t.String(),
  },
  { $id: "#/components/schemas/User" },
);

export type User = Static<typeof UserSchema>;

export const AssetSchema = t.Object(
  {
    id: t.String({ format: "uuid" }),
    groupId: t.Nullable(t.Number()),
    name: t.String(),
    createdAt: t.Date(),
    playables: t.Number(),
  },
  {
    $id: "#/components/schemas/Asset",
  },
);

export type Asset = Static<typeof AssetSchema>;

export const GroupSchema = t.Object(
  {
    id: t.Number(),
    name: t.String(),
  },
  {
    $id: "#/components/schemas/Group",
  },
);

export type Group = Static<typeof GroupSchema>;
