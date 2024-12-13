import { randomUUID } from "crypto";
import { DateTime } from "luxon";
import { kv } from "./adapters/kv";
import { appendInterstitials } from "./interstitials";
import { JSON } from "./lib/json";
import { resolveUri } from "./lib/url";
import type { Interstitial } from "./types";
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
    const interstitials = mapSessionInterstitials(
      startTime,
      params.interstitials,
    );
    appendInterstitials(session.interstitials, interstitials);
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

function mapSessionInterstitials(
  startTime: DateTime,
  interstitials: SessionInterstitial[],
) {
  return interstitials.map<Interstitial>((item) => {
    const { time, duration, assets, ...rest } = item;
    const dateTime =
      typeof time === "string"
        ? DateTime.fromISO(time)
        : startTime.plus({ seconds: time });

    return {
      dateTime,
      duration,
      assets: assets?.map((asset) => {
        const { uri, ...rest } = asset;
        return { url: resolveUri(uri), ...rest };
      }),
      ...rest,
    };
  });
}
