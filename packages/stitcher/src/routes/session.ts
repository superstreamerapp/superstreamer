import { Elysia, t } from "elysia";
import { DateTime } from "luxon";
import { filterSchema } from "../filters";
import { decrypt } from "../lib/crypto";
import {
  createMasterUrl,
  formatAssetList,
  formatMasterPlaylist,
  formatMediaPlaylist,
} from "../playlist";
import { createSession, getSession } from "../session";

export const sessionRoutes = new Elysia()
  .post(
    "/session",
    async ({ body }) => {
      const session = await createSession(body);

      const filter = body.filter;

      const url = createMasterUrl({
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
              time: t.Union([t.Number(), t.String()]),
              maxDuration: t.Optional(t.Number()),
              assets: t.Optional(
                t.Array(
                  t.Object({
                    uri: t.String(),
                  }),
                ),
              ),
              vast: t.Optional(
                t.Object({
                  url: t.String(),
                }),
              ),
            }),
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
        vast: t.Optional(
          t.Object(
            {
              url: t.String(),
            },
            {
              description: "Describes a VAST",
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
    "/out/master.m3u8",
    async ({ set, query }) => {
      const url = decrypt(query.eurl);

      const session = await getSession(query.sid);

      const playlist = await formatMasterPlaylist({
        origUrl: url,
        session,
        filter: query.fil,
      });

      set.headers["content-type"] = "application/vnd.apple.mpegurl";

      return playlist;
    },
    {
      detail: {
        hide: true,
      },
      query: t.Object({
        eurl: t.String(),
        sid: t.String(),
        fil: filterSchema,
      }),
    },
  )
  .get(
    "/out/playlist.m3u8",
    async ({ set, query }) => {
      const session = await getSession(query.sid);

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
        sid: t.String(),
        type: t.Union([
          t.Literal("video"),
          t.Literal("audio"),
          t.Literal("subtitles"),
        ]),
      }),
    },
  )
  .get(
    "/out/asset-list.json",
    async ({ query }) => {
      const sessionId = query.sid;
      const dateTime = DateTime.fromISO(query.dt);

      const session = await getSession(sessionId);

      return await formatAssetList(session, dateTime, query.mdur);
    },
    {
      detail: {
        hide: true,
      },
      query: t.Object({
        dt: t.String(),
        sid: t.String(),
        mdur: t.Optional(t.Number()),
        _HLS_primary_id: t.Optional(t.String()),
      }),
    },
  );
