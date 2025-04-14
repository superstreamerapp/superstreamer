import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi/zod";
import { validator } from "shared/hono/middleware";
import { getAppContext } from "../app-context";
import { filterQuerySchema } from "../filters";
import { createMasterUrl, createOpaqueMasterUrl } from "../playlist";
import { createSession, getSession } from "../session";
import { z } from "../utils/zod";

export const sessionsApp = new Hono()
  /**
   * Create a session.
   */
  .post(
    "/",
    describeRoute({
      summary: "Create a session",
      tags: ["Sessions"],
      responses: {
        200: {
          description: "Successful response",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  url: z.string(),
                }),
              ),
            },
          },
        },
      },
    }),
    validator(
      "json",
      z.object({
        uri: z.string().openapi({
          description: "The HLS master playlist source.",
          examples: ["UUID", "asset://UUID", "https://master.m3u8"],
        }),
        interstitials: z
          .array(
            z.object({
              time: z.union([
                z.number().openapi({
                  description: "Relative to the media time",
                }),
                z.string().openapi({
                  description: "Absolute time, must be an ISO 8601 string",
                }),
              ]),
              duration: z.number().optional().openapi({
                description:
                  "For ad replacement purposes, the interstitial will be treated as a range instead of a point when provided.",
              }),
              delay: z.number().optional(),
              assets: z
                .array(
                  z.object({
                    uri: z.string(),
                  }),
                )
                .optional()
                .openapi({
                  description: "Manually define one or more assets.",
                }),
              vast: z
                .object({
                  url: z.string(),
                })
                .optional()
                .openapi({
                  description:
                    "Provide a VAST url for ad insertion, will resolve to assets.",
                }),
            }),
          )
          .default([])
          .openapi({
            description: "Manually defined interstitials at given times.",
          }),
        filter: z
          .object({
            resolution: z.string().optional(),
            audioLanguage: z.string().optional(),
            textAutoSelect: z.enum(["none", "disabled"]).optional(),
          })
          .optional()
          .openapi({
            description: "Applies filters to the playout.",
          }),
        vmap: z
          .object({
            url: z.string(),
          })
          .optional()
          .openapi({
            description:
              "Add interstitials based on the ads defined in the VMAP.",
          }),
        vast: z
          .object({
            url: z.string().optional(),
          })
          .optional()
          .openapi({
            description:
              "Generic VAST configuration, typically used for live where ad signaling is used to replace linear breaks.",
          }),
        defines: z
          .array(
            z.object({
              name: z.string(),
              value: z.string().optional(),
            }),
          )
          .default([])
          .openapi({
            description:
              "Variables to be imported, when no value is provided, will be derived from query",
          }),
        expiry: z.number().default(60 * 60 * 12),
      }),
    ),
    async (c) => {
      const body = c.req.valid("json");

      const context = await getAppContext(c);

      const session = await createSession(context, body);

      const url = createOpaqueMasterUrl(context, session, body.filter);

      return c.json({ url }, 200);
    },
  )

  /**
   * Redirects a particular session to the master URL.
   */
  .get(
    "/:sessionId/master.m3u8",
    validator(
      "param",
      z.object({
        sessionId: z.string(),
      }),
    ),
    validator(
      "query",
      z.object({
        fil: filterQuerySchema,
      }),
    ),
    async (c) => {
      const params = c.req.valid("param");
      const query = c.req.valid("query");

      const context = await getAppContext(c);

      const session = await getSession(context, params.sessionId);

      const url = createMasterUrl(context, session, session.url, query.fil);

      return c.redirect(url);
    },
  );
