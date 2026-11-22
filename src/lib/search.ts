import uFuzzy from '@leeoniya/ufuzzy';
import { placeName, type Link, type Space } from './tree';

/** A stretch of a title or site name, marked when it matches what was typed. */
export interface Part {
  text: string;
  match: boolean;
}

export interface Result {
  link: Link;
  /** Where the link lives, like "Work › Repos". */
  place: Part[];
  title: Part[];
  /** The URL without its scheme or "www.", which starts with the site. */
  address: Part[];
}

const fuzzy = new uFuzzy({
  // A few letters may be skipped between the typed ones, so "gthb" finds "GitHub".
  intraIns: 3,
  // uFuzzy's own order, except that between equally good matches the shorter title and site
  // come first, so "GitHub" comes before "GitHub Docs". uFuzzy itself goes alphabetical.
  sort: ({ idx, chars, terms, interLft2, interLft1, start, intraIns, interIns, cases }, haystack) =>
    idx
      .map((_, i) => i)
      .sort(
        (a, b) =>
          chars[b]! - chars[a]! ||
          intraIns[a]! - intraIns[b]! ||
          terms[b]! + interLft2[b]! + 0.5 * interLft1[b]! - (terms[a]! + interLft2[a]! + 0.5 * interLft1[a]!) ||
          interIns[a]! - interIns[b]! ||
          start[a]! - start[b]! ||
          cases[b]! - cases[a]! ||
          haystack[idx[a]!]!.length - haystack[idx[b]!]!.length ||
          haystack[idx[a]!]!.localeCompare(haystack[idx[b]!]!),
      ),
});

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

/** The rest of the URL after its site, left out when it's only "/". */
const afterHost = (url: string, host: string) => {
  const rest = url.replace(/^https?:\/\/(www\.)?/, '').slice(host.length);
  return rest === '/' ? '' : rest;
};

/** Splits `text` into matched and unmatched parts. `ranges` are [start, end] pairs counted from `offset`. */
function split(text: string, ranges: number[], offset: number): Part[] {
  const parts: Part[] = [];
  let at = 0;
  const push = (end: number, match: boolean) => {
    if (end > at) parts.push({ text: text.slice(at, end), match });
    at = Math.max(at, end);
  };
  for (let i = 0; i < ranges.length; i += 2) {
    const start = Math.min(Math.max(ranges[i]! - offset, 0), text.length);
    const end = Math.min(Math.max(ranges[i + 1]! - offset, 0), text.length);
    push(start, false);
    push(end, true);
  }
  push(text.length, false);
  return parts;
}

/** The links in `haystack` that match, best first, with the matched stretches of each. */
function find(haystack: string[], needle: string): { index: number; ranges: number[] }[] {
  // Up to 5 words can come in any order. More would mean too many orders to try.
  const [idxs, info, order] = fuzzy.search(haystack, needle, 5);
  // With very many matches, or more than 5 words, uFuzzy skips ranking and highlighting.
  // The matches are shown as found.
  return info && order
    ? order.map((i) => ({ index: info.idx[i]!, ranges: info.ranges[i]! }))
    : (idxs ?? []).map((index) => ({ index, ranges: [] }));
}

/**
 * Builds a search over the title, site and place of every link in every space, including
 * collapsed categories, so the name of a space or category finds the links in it. Links whose
 * title or site matches come first. Links the page can't open, like bookmarklets, are left
 * out. Accents don't matter, and words can be typed in any order. The returned function gives
 * the best `limit` results, best first.
 */
export function createSearch(spaces: Space[], limit = 50): (query: string) => Result[] {
  const entries = spaces.flatMap((space) => [
    ...space.unsorted.filter((link) => link.openable).map((link) => ({ link, place: placeName(space) })),
    ...space.categories.flatMap((category) =>
      category.links.filter((link) => link.openable).map((link) => ({ link, place: placeName(space, category) })),
    ),
  ]);
  const hosts = entries.map(({ link }) => hostOf(link.url));
  const titlesAndSites = entries.map(({ link }, i) => `${link.title} ${hosts[i]}`);
  const haystack = uFuzzy.latinize(titlesAndSites);
  const withPlaces = uFuzzy.latinize(titlesAndSites.map((text, i) => `${text} ${entries[i]!.place}`));

  return (query) => {
    const needle = uFuzzy.latinize(query.trim());
    if (!needle) return [];
    const byTitle = find(haystack, needle);
    const seen = new Set(byTitle.map(({ index }) => index));
    const byPlace = find(withPlaces, needle).filter(({ index }) => !seen.has(index));
    return [...byTitle, ...byPlace].slice(0, limit).map(({ index, ranges }) => {
      const { link, place } = entries[index]!;
      const host = hosts[index]!;
      // Only the site of the address is searched, so matches in it are all in the site.
      const site = split(host, ranges, link.title.length + 1);
      const rest = afterHost(link.url, host);
      return {
        link,
        place: split(place, ranges, link.title.length + host.length + 2),
        title: split(link.title, ranges, 0),
        address: rest ? [...site, { text: rest, match: false }] : site,
      };
    });
  };
}
