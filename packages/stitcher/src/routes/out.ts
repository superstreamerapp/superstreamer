import { Hono } from "hono";
import { DateTime } from "luxon";
import { z } from "zod";
import { decrypt } from "../lib/crypto";
import {
  formatAssetList,
  formatMasterPlaylist,
  formatMediaPlaylist,
} from "../playlist";
import { getSession } from "../session";
import { validator } from "../validator";
import type { Filter } from "../filters";

export const outApp = new Hono()
  .get(
    "/master.m3u8",
    validator(
      "query",
      z.object({
        eurl: z.string(),
        sid: z.string(),
        fil: z
          .string()
          .transform<Filter>((value) => JSON.parse(atob(value)))
          .optional(),
      }),
    ),
    async (c) => {
      const query = c.req.valid("query");
      const url = decrypt(query.eurl);
      const session = await getSession(query.sid);

      const playlist = await formatMasterPlaylist({
        origUrl: url,
        session,
        filter: query.fil,
      });

      c.header("Content-Type", "application/vnd.apple.mpegurl");

      return c.text(playlist, 200);
    },
  )
  .get(
    "/playlist.m3u8",
    validator(
      "query",
      z.object({
        eurl: z.string(),
        sid: z.string(),
        type: z.enum(["video", "audio", "subtitles"]),
      }),
    ),
    async (c) => {
      const query = c.req.valid("query");
      const url = decrypt(query.eurl);
      const session = await getSession(query.sid);

      const playlist = await formatMediaPlaylist(url, session, query.type);

      c.header("Content-Type", "application/vnd.apple.mpegurl");

      return c.text(playlist, 200);
    },
  )
  .get(
    "asset-list.json",
    validator(
      "query",
      z.object({
        dt: z.string(),
        sid: z.string(),
        mdur: z.number().optional(),
        _HLS_primary_id: z.string().optional(),
        // TODO: _HLS_start_offset
      }),
    ),
    async (c) => {
      const query = c.req.valid("query");
      const dateTime = DateTime.fromISO(query.dt);
      const session = await getSession(query.sid);

      const assetList = await formatAssetList(session, dateTime, query.mdur);

      return c.json(assetList, 200);
    },
  );
