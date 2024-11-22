import * as path from "path";
import { env } from "../env";

const uuidRegex = /^[a-z,0-9,-]{36,36}$/;

const ASSET_PROTOCOL = "asset:";

export function resolveUri(uri: string) {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  const potentialUuid = uri.split("@", 2)[0];
  if (potentialUuid && uuidRegex.test(potentialUuid)) {
    uri = `${ASSET_PROTOCOL}//${uri}`;
  }

  if (uuidRegex.test(uri)) {
    // We prefer using the asset protocol for asset identification but we allow
    // just uuid's too and assume it's a valid assetId.
    uri = `${ASSET_PROTOCOL}//${uri}`;
  }

  if (uri.startsWith(`${ASSET_PROTOCOL}//`)) {
    const [assetId, prefix = "hls"] = uri
      .substring(`${ASSET_PROTOCOL}//`.length)
      .split("@");
    return `${env.PUBLIC_S3_ENDPOINT}/package/${assetId}/${prefix}/master.m3u8`;
  }

  throw new Error(`Invalid uri: "${uri}"`);
}

function buildUrl(
  url: string,
  query: Record<string, string | number | undefined | null> = {},
) {
  const queryString = Object.entries(query)
    .map(([key, value]) => {
      if (value === undefined || value === null) {
        return null;
      }
      return `${key}=${encodeURIComponent(value)}`;
    })
    .filter((chunk) => chunk !== null)
    .join("&");

  return `${url}${queryString ? `?${queryString}` : ""}`;
}

export function joinUrl(urlFile: string, filePath: string) {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  const urlBase = urlFile.substring(0, urlFile.lastIndexOf("/"));

  const url = new URL(urlBase);

  return `${url.protocol}//${url.host}${path.join(url.pathname, filePath)}`;
}

export function makeUrl(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
) {
  return buildUrl(`${env.PUBLIC_STITCHER_ENDPOINT}/${path}`, params);
}
