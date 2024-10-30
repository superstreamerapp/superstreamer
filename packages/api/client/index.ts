import { treaty } from "@elysiajs/eden";
import type { App } from "../src";

export type * from "../src/types";

export function createApiClient(apiKey: string, token?: string | null) {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return treaty<App>(apiKey, {
    headers,
  });
}