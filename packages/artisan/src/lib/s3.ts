import { createReadStream } from "node:fs";
import { GetObjectCommand, S3 } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ConfiguredRetryStrategy } from "@smithy/util-retry";
import { lookup } from "mime-types";
import { S3SyncClient } from "s3-sync-client";
import { assert } from "shared/assert";
import { env } from "../env";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";
import type { CommandInput } from "s3-sync-client";

const client = new S3({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  logger: console,
  retryStrategy: new ConfiguredRetryStrategy(
    10,
    (attempt) => 1000 + attempt * 1000,
  ),
});

const { sync } = new S3SyncClient({ client });

export async function syncFromS3(remotePath: string, localPath: string) {
  await sync(`s3://${env.S3_BUCKET}/${remotePath}`, localPath);
}

export async function syncToS3(
  localPath: string,
  remotePath: string,
  options?: {
    del?: boolean;
    public?: boolean;
  },
) {
  const commandInput: CommandInput<PutObjectCommandInput> = (input) => {
    let contentType: string | undefined;
    if (input.Key) {
      contentType = lookup(input.Key) || "binary/octet-stream";
    }
    return {
      ContentType: contentType,
      ACL: options?.public ? "public-read" : undefined,
    };
  };

  await sync(localPath, `s3://${env.S3_BUCKET}/${remotePath}`, {
    del: options?.del,
    commandInput,
  });
}

type UploadToS3File =
  | { type: "json"; data: object }
  | { type: "local"; path: string };

export async function uploadToS3(
  remoteFilePath: string,
  file: UploadToS3File,
  onProgress?: (value: number) => void,
) {
  let params: Omit<PutObjectCommandInput, "Bucket" | "Key"> | undefined;

  switch (file.type) {
    case "json":
      params = {
        Body: JSON.stringify(file.data, null, 2),
        ContentType: "application/json",
      };
      break;
    case "local":
      params = {
        Body: createReadStream(file.path),
      };
      break;
    default:
      return;
  }

  const upload = new Upload({
    client,
    params: {
      ...params,
      Bucket: env.S3_BUCKET,
      Key: remoteFilePath,
    },
  });

  upload.on("httpUploadProgress", (event) => {
    if (event.loaded === undefined || event.total === undefined) {
      return;
    }
    const value = Math.round((event.loaded / event.total) * 100);
    onProgress?.(value);
  });

  await upload.done();
}

export async function getS3SignedUrl(
  remoteFilePath: string,
  expiresIn: number,
) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: remoteFilePath,
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore https://github.com/aws/aws-sdk-js-v3/issues/4451
  const url = await getSignedUrl(client, command, {
    expiresIn,
  });
  return url;
}

export async function getTextFromS3(remoteFilePath: string) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: remoteFilePath,
  });
  const response = await client.send(command);

  const text = response.Body?.transformToString("utf-8");
  assert(text, `Failed to get text from S3 "${remoteFilePath}"`);

  return text;
}
