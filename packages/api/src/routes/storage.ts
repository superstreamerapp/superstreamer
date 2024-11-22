import { Elysia, t } from "elysia";
import { auth } from "../auth";
import { DeliberateError } from "../errors";
import { StorageFileSchema, StorageFolderSchema } from "../types";
import {
  getStorageFilePayload,
  getStorageFileUrl,
  getStorageFolder,
} from "../utils/s3";

export const storage = new Elysia()
  .use(auth({ user: true }))
  .get(
    "/storage/folder",
    async ({ query }) => {
      return await getStorageFolder(query.path, query.take, query.cursor);
    },
    {
      detail: {
        summary: "Get a storage folder",
        description:
          "Get a folder from your S3 storage by path with all files and subfolders.",
        tags: ["Storage"],
      },
      query: t.Object({
        path: t.String(),
        cursor: t.Optional(t.String()),
        take: t.Optional(t.Number()),
      }),
      response: {
        200: StorageFolderSchema,
      },
    },
  )
  .get(
    "/storage/file",
    async ({ query }) => {
      const ext = query.path.split(".").pop();
      switch (ext) {
        case "m4v":
        case "mp4":
        case "mkv":
          return {
            mode: "url",
            url: await getStorageFileUrl(query.path),
            type: "video",
          };
        case "png":
        case "webp":
          return {
            mode: "url",
            url: await getStorageFileUrl(query.path),
            type: "image",
          };
        case "m4a":
        case "mp3":
          return {
            mode: "url",
            url: await getStorageFileUrl(query.path),
            type: "audio",
          };
        case "m3u8":
        case "json":
        case "vtt":
          return {
            mode: "payload",
            payload: await getStorageFilePayload(query.path),
          };
        default:
          throw new DeliberateError({ type: "ERR_STORAGE_NO_FILE_PREVIEW" });
      }
    },
    {
      detail: {
        summary: "Get a file",
        description: "Get a fle from your S3 storage by path.",
        tags: ["Storage"],
      },
      query: t.Object({
        path: t.String(),
      }),
      response: {
        200: StorageFileSchema,
      },
    },
  );
