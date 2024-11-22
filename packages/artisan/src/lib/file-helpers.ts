import { getS3SignedUrl, getTextFromS3 } from "./s3";
import type { PartialInput, Stream } from "bolt";

export async function getBinaryPath(name: string) {
  const direct = `${process.cwd()}/bin/${name}`;
  const directExists = await Bun.file(direct).exists();
  if (directExists) {
    return direct;
  }

  const packagesDir = `${import.meta.path.substring(0, import.meta.path.indexOf("/artisan"))}`;
  const local = `${packagesDir}/artisan/bin/${name}`;
  const localExists = await Bun.file(local).exists();
  if (localExists) {
    return local;
  }

  throw new Error(
    `Failed to get bin dep "${name}", run scripts/bin-deps.sh to install binary dependencies.`,
  );
}

export async function mapInputToPublicUrl(input: PartialInput) {
  if (input.path.startsWith("s3://")) {
    const path = input.path.substring(5);
    return await getS3SignedUrl(path, 60 * 60 * 24);
  }

  if (input.path.startsWith("http://") || input.path.startsWith("https://")) {
    return input.path;
  }

  throw new Error("Failed to map input to public URL, invalid scheme.");
}

export interface MetaStruct {
  version: number;
  streams: Record<string, Stream>;
  segmentSize: number;
}

/**
 * Will fetch meta file when meta.json
 * @param assetId
 * @returns
 */
export async function getMetaStruct(assetId: string): Promise<MetaStruct> {
  const text = await getTextFromS3(`transcode/${assetId}/meta.json`);
  return JSON.parse(text);
}
