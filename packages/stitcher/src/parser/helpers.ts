import type { Rendition, Variant } from "./types";

export function getRenditions(variants: Variant[]) {
  const group = new Set<Rendition>();
  variants.forEach((variant) => {
    variant.audio.forEach((rendition) => {
      group.add(rendition);
    });
    variant.subtitles.forEach((rendition) => {
      group.add(rendition);
    });
  });
  return Array.from(group.values());
}

export function mapAttributes(
  param: string,
  callback: (key: string, value: string) => void,
) {
  const items = splitByCommaWithPreservingQuotes(param);
  items.forEach((item) => {
    const [key, value] = item.split(/=(.+)/);
    if (key === undefined || value === undefined) {
      return;
    }
    callback(key, unquote(value));
  });
}

export function unquote(value: string) {
  return value.replace(/['"]+/g, "");
}

export function partOf<T extends readonly string[]>(
  list: T,
  value: string,
): value is T[number] {
  return list.includes(value);
}

function splitByCommaWithPreservingQuotes(str: string) {
  const list: string[] = [];

  let doParse = true;
  let start = 0;

  const prevQuotes: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const curr = str[i];

    if (doParse && curr === ",") {
      list.push(str.slice(start, i).trim());
      start = i + 1;
      continue;
    }

    if (curr === '"' || curr === "'") {
      if (doParse) {
        prevQuotes.push(curr);
        doParse = false;
      } else if (curr === prevQuotes.at(-1)) {
        prevQuotes.pop();
        doParse = true;
      } else {
        prevQuotes.push(curr);
      }
    }
  }

  list.push(str.slice(start).trim());

  return list;
}
