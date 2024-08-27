import { initContract } from "@ts-rest/core";
import * as z from "zod";

const c = initContract();

export const postSessionBodySchema = z.object({
  assetId: z.string(),
  vmapUrl: z.string().optional(),
  interstitials: z
    .array(
      z.object({
        timeOffset: z.number(),
        assetId: z.string(),
      }),
    )
    .optional(),
  bumperAssetId: z.string().optional(),
});

export const contract = c.router({
  postSession: {
    method: "POST",
    path: "/session",
    body: postSessionBodySchema,
    responses: {},
  },
  getMasterPlaylist: {
    method: "GET",
    path: "/session/:sessionId/master.m3u8",
    responses: {},
  },
  getMediaPlaylist: {
    method: "GET",
    path: "/session/:sessionId/:path/playlist.m3u8",
    responses: {},
  },
  getAssetList: {
    method: "GET",
    path: "/session/:sessionId/asset-list.json",
    query: z.object({
      timeOffset: z.coerce.number(),
    }),
    responses: {},
  },
  getSpec: {
    method: "GET",
    path: "/spec.json",
    responses: {},
  },
});
