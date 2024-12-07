import { randomUUID } from "crypto";
import { DateTime } from "luxon";
import { kv } from "./adapters/kv";
import { JSON } from "./lib/json";
import { resolveUri } from "./lib/url";
import type { Interstitial, InterstitialAssetType } from "./types";
import type { VmapParams } from "./vmap";

export interface Session {
  id: string;
  url: string;
  expiry: number;
  startTime: DateTime;

  // User defined options
  vmap?: VmapParams;
  interstitials: Interstitial[];
}

export async function createSession(params: {
  uri: string;
  vmap?: {
    url: string;
  };
  interstitials?: {
    time: string | number;
    assetListUrl?: string;
    vastUrl?: string;
    uri?: string;
    type?: InterstitialAssetType;
  }[];
  expiry?: number;
}) {
  const id = randomUUID();
  const startTime = DateTime.now();

  const session: Session = {
    id,
    url: resolveUri(params.uri),
    vmap: params.vmap,
    startTime,
    interstitials: [],
    // A session is valid for 3 hours by default.
    expiry: params.expiry ?? 60 * 60 * 3,
  };

  if (params.interstitials) {
    params.interstitials.forEach((interstitial) => {
      const dateTime =
        typeof interstitial.time === "string"
          ? DateTime.fromISO(interstitial.time)
          : startTime.plus({ seconds: interstitial.time });

      if (interstitial.uri) {
        session.interstitials.push({
          dateTime,
          asset: {
            url: resolveUri(interstitial.uri),
            type: interstitial.type,
          },
        });
      }

      if (interstitial.vastUrl) {
        session.interstitials.push({
          dateTime,
          vastUrl: interstitial.vastUrl,
        });
      }

      if (interstitial.assetListUrl) {
        session.interstitials.push({
          dateTime,
          assetListUrl: interstitial.assetListUrl,
        });
      }
    });
  }

  // We'll initially store the session for 10 minutes, if it's not been consumed
  // within the timeframe, it's gone.
  const value = JSON.stringify(session);
  await kv.set(`session:${id}`, value, 60 * 10);

  return session;
}

export async function getSession(id: string) {
  const data = await kv.get(`session:${id}`);
  if (!data) {
    throw new Error(`No session found for id ${id}`);
  }
  return JSON.parse<Session>(data);
}

export async function updateSession(session: Session) {
  const value = JSON.stringify(session);
  await kv.set(`session:${session.id}`, value, session.expiry);
}
