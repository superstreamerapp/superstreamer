import { randomUUID } from "crypto";
import { DateTime } from "luxon";
import { kv } from "./adapters/kv";
import { mergeInterstitials } from "./interstitials";
import { JSON } from "./lib/json";
import { resolveUri } from "./lib/url";
import { fetchDuration } from "./playlist";
import type { Interstitial, InterstitialChunk } from "./types";
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

interface SessionInterstitial {
  time: number | string;
  duration?: number;
  assets?: {
    uri: string;
    kind?: "ad" | "bumper";
  }[];
  vast?: {
    url: string;
  };
  assetList?: {
    url: string;
  };
}

export async function createSession(params: {
  uri: string;
  vmap?: VmapParams;
  interstitials?: SessionInterstitial[];
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
    const interstitials = await mapSessionInterstitials(
      startTime,
      params.interstitials,
    );
    mergeInterstitials(session.interstitials, interstitials);
  }

  const value = JSON.stringify(session);
  await kv.set(`session:${id}`, value, session.expiry);

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

async function mapSessionInterstitials(
  startTime: DateTime,
  interstitials: SessionInterstitial[],
) {
  const result: Interstitial[] = [];

  for (const interstitial of interstitials) {
    const dateTime =
      typeof interstitial.time === "string"
        ? DateTime.fromISO(interstitial.time)
        : startTime.plus({ seconds: interstitial.time });

    const chunks: InterstitialChunk[] = [];

    if (interstitial.assets) {
      for (const asset of interstitial.assets) {
        const { uri, kind } = asset;

        const url = resolveUri(uri);

        chunks.push({
          type: "asset",
          data: {
            url,
            duration: await fetchDuration(url),
            kind,
          },
        });
      }
    }

    if (interstitial.vast) {
      chunks.push({ type: "vast", data: interstitial.vast });
    }

    if (interstitial.assetList) {
      chunks.push({ type: "assetList", data: interstitial.assetList });
    }

    result.push({
      dateTime,
      duration: interstitial.duration,
      chunks,
    });
  }

  return result;
}
