import { client } from "./redis.js";
import { randomUUID } from "crypto";
import { assert } from "./assert.js";
import type {
  Session,
  SessionInterstitial,
  SessionFilter,
  SessionVmap,
} from "./types.js";

const REDIS_PREFIX = `stitcher:session`;

function redisKey(sessionId: string) {
  return `${REDIS_PREFIX}:${sessionId}`;
}

export async function createSession(data: {
  uri: string;
  interstitials?: SessionInterstitial[];
  filter?: SessionFilter;
  vmap?: SessionVmap;
}) {
  const sessionId = randomUUID();

  const session: Session = {
    id: sessionId,
    uri: data.uri,
    filter: data.filter,
    interstitials: data.interstitials,
    vmap: data.vmap,
  };

  const key = redisKey(sessionId);

  await client.set(key, JSON.stringify(session), {
    EX: 60 * 60 * 6,
  });

  return session;
}

export async function getSession(sessionId: string) {
  const data = await client.get(redisKey(sessionId));
  assert(data, `No session found for ${sessionId}`);

  if (typeof data !== "string") {
    throw new SyntaxError(
      "Redis did not return a string for session, cannot deserialize.",
    );
  }

  return JSON.parse(data) as Session;
}

export async function updateSession(session: Session) {
  const key = redisKey(session.id);
  await client.set(key, JSON.stringify(session), {
    EX: await client.ttl(key),
  });
}
