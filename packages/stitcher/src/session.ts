import { randomUUID } from "crypto";
import { DateTime } from "luxon";
import { kv } from "./adapters/kv";
import { JSON } from "./lib/json";
import { resolveUri } from "./lib/url";
import { fetchDuration } from "./playlist";
import type { TimedEvent } from "./types";

export interface Session {
  id: string;
  url: string;
  expiry: number;

  startTime: DateTime;

  vmap?: {
    url: string;
    // TODO: This is currently an object, but we might want to keep VMAP specific info
    // later, which we can do here.
    result?: object;
  };
  vast?: {
    url?: string;
  };
  events: TimedEvent[];
}

interface InterstitialParam {
  time: string | number;
  maxDuration?: number;
  assets?: {
    uri: string;
  }[];
  vast?: {
    url?: string;
  };
}

export async function createSession(params: {
  uri: string;
  vmap?: {
    url: string;
  };
  vast?: {
    url?: string;
  };
  interstitials?: InterstitialParam[];
  expiry?: number;
}) {
  const id = randomUUID();
  const startTime = DateTime.now();
  const url = resolveUri(params.uri);

  const session: Session = {
    id,
    url,
    // A session is valid for 3 hours by default.
    expiry: params.expiry ?? 60 * 60 * 3,

    startTime,

    vmap: params.vmap,
    vast: params.vast,
    events: [],
  };

  if (params.interstitials) {
    const events = await Promise.all(
      params.interstitials.map((interstitial) =>
        mapInterstitialToTimedEvent(startTime, interstitial),
      ),
    );
    session.events.push(...events);
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

export async function mapInterstitialToTimedEvent(
  startTime: DateTime,
  interstitial: InterstitialParam,
) {
  const dateTime =
    typeof interstitial.time === "string"
      ? DateTime.fromISO(interstitial.time)
      : startTime.plus({ seconds: interstitial.time });

  const event: TimedEvent = {
    dateTime,
    maxDuration: interstitial.maxDuration,
  };

  // The interstitial contains one or more assets.
  if (interstitial.assets) {
    event.assets = await Promise.all(
      interstitial.assets.map(async (asset) => {
        const url = resolveUri(asset.uri);
        return {
          url,
          duration: await fetchDuration(url),
        };
      }),
    );
  }

  // The interstitial contains a vast config, pass it on.
  event.vast = interstitial.vast;

  return event;
}
