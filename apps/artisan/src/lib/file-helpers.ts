import * as fs from "node:fs/promises";
import { getS3SignedUrl } from "./s3";
import type { PartialInput, Stream } from "bolt";
import { join } from "node:path";

export async function getBinaryPath(name: string) {
  const direct = join(process.cwd(), 'bin', name);
  const directExists = await Bun.file(direct).exists();
  if (directExists) {
    console.log('direct', direct);
    return direct + '.exe';
  }

  const packagesDir = `${import.meta.path.substring(0, import.meta.path.indexOf("artisan") - 1)}`;
  // const local = `${packagesDir}/artisan/bin/${name}`;
  const local = join(packagesDir, 'artisan', 'bin', name) + '.exe';
  console.log('packagesDir', local);
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
 * Will fetch meta file when meta.json is found in path.
 * @param path S3 dir
 * @returns
 */
export async function getMetaStruct(path: string): Promise<MetaStruct> {
  const text = await fs.readFile(join(path, 'meta.json'), "utf8");
  return JSON.parse(text.toString());
}
