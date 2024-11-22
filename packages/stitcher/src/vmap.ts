import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { toS } from "hh-mm-ss";

export interface VmapAdBreak {
  timeOffset: string;
  vastUrl?: string;
  vastData?: string;
}

export interface VmapResponse {
  adBreaks: VmapAdBreak[];
}

export interface VmapParams {
  url: string;
}

export async function fetchVmap(params: VmapParams): Promise<VmapResponse> {
  const USER_AGENT =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
  const response = await fetch(params.url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });
  const text = await response.text();
  return parseVmap(text);
}

function parseVmap(text: string): VmapResponse {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");
  const rootElement = doc.documentElement;

  if (rootElement.localName !== "VMAP") {
    throw new Error("Url did not resolve in a vmap");
  }

  const adBreaks = childList(rootElement).reduce<VmapAdBreak[]>(
    (acc, element) => {
      const adBreak = formatAdBreak(element);
      if (adBreak) {
        acc.push(adBreak);
      }

      return acc;
    },
    [],
  );

  return {
    adBreaks,
  };
}

function formatAdBreak(element: Element): VmapAdBreak | null {
  if (element.localName !== "AdBreak") {
    return null;
  }

  const timeOffset = element.getAttribute("timeOffset");
  if (timeOffset === null) {
    return null;
  }

  const vastUrl = getVastUrl(element);
  const vastData = getVastData(element);
  if (!vastUrl && !vastData) {
    return null;
  }

  return {
    timeOffset,
    vastUrl,
    vastData,
  };
}

function getAdSource(element: Element) {
  return childList(element).find((child) => child.localName === "AdSource");
}

function getVastUrl(element: Element) {
  const adSource = getAdSource(element);
  if (!adSource) {
    return;
  }

  const adTagUri = childList(adSource).find(
    (child) => child.localName === "AdTagURI",
  );

  return adTagUri?.textContent?.trim();
}

function getVastData(element: Element) {
  const adSource = getAdSource(element);
  if (!adSource) {
    return;
  }

  const vastAdData = childList(adSource).find(
    (child) => child.localName === "VASTAdData",
  );

  if (!vastAdData?.firstChild) {
    return;
  }

  const xmlSerializer = new XMLSerializer();

  return xmlSerializer.serializeToString(vastAdData.firstChild);
}

function childList(node: Element) {
  return Array.from(node.childNodes) as Element[];
}

export function toAdBreakTimeOffset(adBreak: VmapAdBreak) {
  if (adBreak.timeOffset === "start") {
    return 0;
  }
  if (adBreak.timeOffset === "end") {
    return null;
  }
  return toS(adBreak.timeOffset);
}
