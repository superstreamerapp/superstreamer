import { Elysia, t } from "elysia";
import { filterSchema } from "../filters";
import { decrypt } from "../lib/crypto";
import {
  formatAssetList,
  formatMasterPlaylist,
  formatMediaPlaylist,
  makeMasterUrl,
} from "../playlist";
import {
  createSession,
  getSession,
  processSessionOnMasterReq,
} from "../session";
import type { Filter } from "../filters";
import type { Session } from "../session";

async function handleMasterPlaylist(
  origUrl: string,
  session?: Session,
  filter?: Filter,
) {
  if (session) {
    await processSessionOnMasterReq(session);
  }

  const sessionId = session?.id;
  const playlist = await formatMasterPlaylist({
    origUrl,
    sessionId,
    filter,
  });

  return playlist;
}

export const sessionRoutes = new Elysia()
  .post(
    "/session",
    async ({ body }) => {
      const session = await createSession(body);

      const filter = body.filter;

      const { url } = makeMasterUrl({
        url: session.url,
        filter,
        session,
      });

      return { url };
    },
    {
      detail: {
        summary: "Create a session",
      },
      body: t.Object({
        uri: t.String({
          description:
            'Reference to a master playlist, you can point to an asset with "asset://{uuid}" or as http(s).',
        }),
        interstitials: t.Optional(
          t.Array(
            t.Object({
              position: t.Number(),
              uri: t.String(),
              duration: t.Optional(t.Number()),
              type: t.Optional(t.Union([t.Literal("ad"), t.Literal("bumper")])),
            }),
            {
              description: "Manual HLS interstitial insertion.",
            },
          ),
        ),
        filter: t.Optional(
          t.Object(
            {
              resolution: t.Optional(
                t.String({
                  description: 'Filter on resolution, like "<=720".',
                }),
              ),
              audioLanguage: t.Optional(t.String()),
            },
            {
              description: "Filter applies to master and media playlist.",
            },
          ),
        ),
        vmap: t.Optional(
          t.Object(
            {
              url: t.String(),
            },
            {
              description:
                "Describes a VMAP, will transcode ads and insert interstitials on the fly.",
            },
          ),
        ),
        expiry: t.Optional(
          t.Number({
            description:
              "In seconds, the session will no longer be available after this time.",
            default: 3600,
            minimum: 60,
          }),
        ),
      }),
    },
  )
  .get(
    "/session/:sessionId/master.m3u8",
    async ({ set, params, query }) => {
      const session = await getSession(params.sessionId);

      const playlist = await handleMasterPlaylist(
        session.url,
        session,
        query.fil,
      );

      set.headers["content-type"] = "application/vnd.apple.mpegurl";

      return playlist;
    },
    {
      params: t.Object({
        sessionId: t.String(),
      }),
      query: t.Object({
        fil: filterSchema,
      }),
    },
  )
  .get(
    "/out/master.m3u8",
    async ({ set, query }) => {
      const url = decrypt(query.eurl);

      const session = query.sid ? await getSession(query.sid) : undefined;
      const playlist = await handleMasterPlaylist(url, session, query.fil);

      set.headers["content-type"] = "application/vnd.apple.mpegurl";

      return playlist;
    },
    {
      detail: {
        hide: true,
      },
      query: t.Object({
        eurl: t.String(),
        sid: t.Optional(t.String()),
        fil: filterSchema,
      }),
    },
  )
  .get(
    "/out/playlist.m3u8",
    async ({ set, query }) => {
      const session = query.sid ? await getSession(query.sid) : undefined;

      const url = decrypt(query.eurl);
      const type = query.type;

      const playlist = await formatMediaPlaylist(url, session, type);

      set.headers["content-type"] = "application/vnd.apple.mpegurl";

      return playlist;
    },
    {
      detail: {
        hide: true,
      },
      query: t.Object({
        eurl: t.String(),
        sid: t.Optional(t.String()),
        type: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/out/asset-list.json",
    async ({ query }) => {
      const sessionId = query.sid;
      const timeOffset = query.timeOffset;

      const session = await getSession(sessionId);

      return await formatAssetList(session, timeOffset);
    },
    {
      detail: {
        hide: true,
      },
      query: t.Object({
        timeOffset: t.Optional(t.Number()),
        sid: t.String(),
        _HLS_primary_id: t.Optional(t.String()),
      }),
    },
  );
