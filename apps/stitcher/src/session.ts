import { DateTime } from "luxon";
import * as uuid from "uuid";
import { apiError } from "./errors";
import { JSON } from "./lib/json";
import { resolveUri } from "./lib/url";
import { fetchDuration, pushTimedEvent } from "./playlist";
import type { AppContext } from "./app-context";
import type { Asset, Define, TimedEvent } from "./types";

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

  timedEvents: TimedEvent[];
  defines: Define[];
}

interface InterstitialInput {
  time: string | number;
  duration?: number;
  delay?: number;
  assets?: {
    uri: string;
  }[];
  vast?: {
    url: string;
  };
}

interface DefineInput {
  name: string;
  value?: string;
}

interface CreateSessionParams {
  uri: string;
  expiry: number;
  interstitials: InterstitialInput[];
  defines: DefineInput[];
  vmap?: {
    url: string;
  };
  vast?: {
    url?: string;
  };
}

export async function createSession(
  context: AppContext,
  params: CreateSessionParams,
) {
  const id = uuid.v4();
  const startTime = DateTime.now();
  const url = resolveUri(context, params.uri);

  const session: Session = {
    id,
    url,
    expiry: params.expiry,
    startTime,
    vmap: params.vmap,
    vast: params.vast,
    timedEvents: [],
    defines: params.defines,
  };

  if (params.interstitials) {
    for (const interstitial of params.interstitials) {
      const event = await mapInterstitialToTimedEvent(
        context,
        startTime,
        interstitial,
      );
      pushTimedEvent(session.timedEvents, event);
    }
  }

  const value = JSON.stringify(session);
  await context.kv.set(`session:${id}`, value, session.expiry);

  return session;
}

export async function getSession(context: AppContext, id: string) {
  const data = await context.kv.get(`session:${id}`);
  if (!data) {
    throw apiError("ERR_SESSION_NOT_FOUND");
  }

  const session = JSON.parse<Session>(data);

  // Check if the session is expired, we might still have it in kv.
  const expiryDate = session.startTime.plus({ seconds: session.expiry });
  if (DateTime.now() > expiryDate) {
    throw apiError("ERR_SESSION_NOT_FOUND");
  }

  return session;
}

export async function updateSession(context: AppContext, session: Session) {
  const value = JSON.stringify(session);
  await context.kv.set(`session:${session.id}`, value, session.expiry);
}

export async function mapInterstitialToTimedEvent(
  context: AppContext,
  startTime: DateTime,
  interstitial: InterstitialInput,
): Promise<TimedEvent> {
  let assets: Asset[] | undefined;
  if (interstitial.assets) {
    assets = [];
    for (const asset of interstitial.assets) {
      const url = resolveUri(context, asset.uri);
      assets.push({
        url,
        duration: await fetchDuration(url),
      });
    }
  }
  return {
    dateTime: toDateTime(startTime, interstitial.time),
    duration: interstitial.duration,
    delay: interstitial.delay,
    assets,
    vast: interstitial.vast,
  };
}

function toDateTime(startTime: DateTime, time: string | number) {
  return typeof time === "string"
    ? DateTime.fromISO(time)
    : startTime.plus({ seconds: time });
}
