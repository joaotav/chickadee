// The bookmarks HTML file, the format every browser and most bookmark tools export and import.
import { WORKSPACE_TITLE } from './bookmarks';
import { isFolder, isLink, type BookmarkNode } from './node';

export interface FileLink {
  title: string;
  url: string;
}

/** What a bookmarks file holds, shaped like the Workspace: spaces of categories of links. */
export interface BookmarksFile {
  /** Links outside any space, which go to Unsorted. */
  loose: FileLink[];
  spaces: {
    title: string;
    /** Links in the space outside any category, shown in its Unsorted card. */
    loose: FileLink[];
    categories: { title: string; links: FileLink[] }[];
  }[];
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Writes the Workspace as a bookmarks file, inside a folder named Workspace, so the browser's
 * own import keeps it together and `readFile` finds it. Separators are left out.
 */
export function toHtml(workspace: BookmarkNode): string {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];
  const write = (node: BookmarkNode, title: string, depth: number) => {
    const indent = '    '.repeat(depth);
    if (isLink(node)) {
      lines.push(`${indent}<DT><A HREF="${escape(node.url)}">${escape(title)}</A>`);
    } else if (isFolder(node)) {
      lines.push(`${indent}<DT><H3>${escape(title)}</H3>`, `${indent}<DL><p>`);
      for (const child of node.children ?? []) write(child, child.title, depth + 1);
      lines.push(`${indent}</DL><p>`);
    }
  };
  write(workspace, WORKSPACE_TITLE, 1);
  lines.push('</DL><p>');
  return `${lines.join('\n')}\n`;
}

type Item = FileLink | { title: string; children: Item[] };
type Folder = Extract<Item, { children: Item[] }>;
const isFileFolder = (item: Item): item is Folder => 'children' in item;
const isFileLink = (item: Item): item is FileLink => 'url' in item;

/**
 * The folders and links in a list. In the file, each item is a <DT> holding a link, or a
 * folder's heading followed by its own list.
 */
function readList(list: Element): Item[] {
  return [...list.children]
    .filter((entry) => entry.tagName === 'DT')
    .flatMap((entry): Item[] => {
      const heading = entry.querySelector(':scope > h3');
      if (heading) {
        const sublist = entry.querySelector(':scope > dl');
        return [{ title: heading.textContent?.trim() ?? '', children: sublist ? readList(sublist) : [] }];
      }
      const link = entry.querySelector(':scope > a[href]');
      return link ? [{ title: link.textContent?.trim() ?? '', url: link.getAttribute('href')! }] : [];
    });
}

/** The first folder with this title, nearest the top first. */
function findFolder(items: Item[], title: string): Folder | undefined {
  const queue = items.filter(isFileFolder);
  for (const folder of queue) {
    if (folder.title === title) return folder;
    queue.push(...folder.children.filter(isFileFolder));
  }
  return undefined;
}

/** Every link in a folder and the folders inside it, in order. */
const allLinks = (folder: Folder): FileLink[] => folder.children.flatMap((item) => (isFileFolder(item) ? allLinks(item) : [item]));

/**
 * Reads a bookmarks file. A file with a Workspace folder, like one exported from Chickadee or
 * a browser's full export, gives that folder's spaces only. In any other file, the top folders
 * become spaces and their folders categories. Folders deeper than that are flattened into
 * their category.
 */
export function readFile(html: string): BookmarksFile {
  const list = new DOMParser().parseFromString(html, 'text/html').querySelector('dl');
  const items = list ? readList(list) : [];
  const source = findFolder(items, WORKSPACE_TITLE)?.children ?? items;
  return {
    loose: source.filter(isFileLink),
    spaces: source.filter(isFileFolder).map((space) => ({
      title: space.title,
      loose: space.children.filter(isFileLink),
      categories: space.children.filter(isFileFolder).map((category) => ({ title: category.title, links: allLinks(category) })),
    })),
  };
}
