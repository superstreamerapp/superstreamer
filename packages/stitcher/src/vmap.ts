import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import * as timeFormat from "hh-mm-ss";
import { env } from "./env.js";
import { DateTime } from "luxon";
import { assert } from "./assert.js";
import type { DateRange } from "./parser/index.js";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36";

export type VmapAdBreak = {
  timeOffset: number;
  vastUrl?: string;
  vastData?: string;
};

export type VmapResponse = {
  adBreaks: VmapAdBreak[];
};

export async function fetchVmap(url: string): Promise<VmapResponse> {
  const doc = await getXml(url);
  const rootElement = doc.documentElement;

  if (rootElement.localName !== "VMAP") {
    throw new Error("Url did not resolve in a vmap");
  }

  const adBreaks: VmapAdBreak[] = [];

  childList(rootElement).forEach((element) => {
    if (element.localName === "AdBreak") {
      const timeOffset = toTimeOffset(element.getAttribute("timeOffset"));
      if (timeOffset === null) {
        return;
      }

      adBreaks.push({
        timeOffset,
        vastUrl: getVastUrl(element),
        vastData: getVastData(element),
      });
    }
  });

  return { adBreaks };
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

async function getXml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  const text = await response.text();

  const parser = new DOMParser();

  return parser.parseFromString(text, "text/xml");
}

function childList(node: Element) {
  return Array.from(node.childNodes) as Element[];
}

function toTimeOffset(value: string | null) {
  if (value === null) {
    return null;
  }
  if (value === "start") {
    return 0;
  }
  if (value === "end") {
    return null;
  }
  return timeFormat.toS(value);
}

export function formatAdBreaksToDateRanges(
  date: DateTime,
  vmapResponse: VmapResponse,
  sessionId: string,
) {
  return vmapResponse.adBreaks.map<DateRange>((adBreak) => {
    const startDate = date.plus({ seconds: adBreak.timeOffset });

    const startDateISO = startDate.toISO();
    assert(startDateISO);

    const clientAttributes = {
      RESTRICT: "SKIP,JUMP",
      "RESUME-OFFSET": 0,
      "ASSET-LIST": `${env.PUBLIC_STITCHER_ENDPOINT}/asset-list.json?sessionId=${sessionId}&startDate=${encodeURIComponent(startDateISO)}`,
    };

    return {
      classId: "com.apple.hls.interstitial",
      id: `adBreak(${adBreak.timeOffset})`,
      startDate,
      clientAttributes,
    };
  });
}
