import { browser } from 'wxt/browser';
import type { BookmarksFile, FileLink } from './bookmarks-file';
import { isFolder, isLink, type BookmarkNode } from './node';
import { joinEmoji, sameName, splitEmoji, toWebUrl } from './tree';
import { remove } from './undo';

/** What an import did. */
export interface Imported {
  /**
   * What it created in folders that were there before. Removing these removes everything it
   * added, since the rest is inside them.
   */
  created: string[];
  /** How many links it added. */
  links: number;
  /** The spaces it added to, in order. Links outside any space count as the Workspace's. */
  spaces: string[];
  /** How many links it left out: ones that aren't web pages, like bookmarklets, and ones the browser refused. */
  skipped: number;
}

const nameOf = (title: string) => splitEmoji(title).name;

// Addresses the way the browser stores them, so "https://github.com" matches "https://github.com/".
function normal(url: string) {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}

/** The names of the spaces here that the file also has, ignoring the icon and letter case. */
export const takenSpaces = (file: BookmarksFile, names: string[]) =>
  names.filter((name) => file.spaces.some((space) => sameName(nameOf(space.title), name)));

/** The title, or the title with the first free number after it, like "Work (2)". */
function freeTitle(title: string, spaces: BookmarkNode[]) {
  const { emoji, name } = splitEmoji(title);
  const taken = (candidate: string) => spaces.some((space) => sameName(nameOf(space.title), candidate));
  if (!taken(name)) return title;
  let number = 2;
  while (taken(`${name} (${number})`)) number++;
  return joinEmoji(emoji, `${name} (${number})`);
}

/**
 * Adds a bookmarks file to the Workspace, never changing or deleting what's there. Links that
 * aren't web pages are left out. With
 * `merge`, a space or category with the same name as one already here gets the new things,
 * skipping links whose address it already has. With `separate`, every space in the file is
 * added as a new one, with a number after a taken name.
 */
export async function importFile(file: BookmarksFile, workspace: BookmarkNode, mode: 'merge' | 'separate'): Promise<Imported> {
  const result: Imported = { created: [], links: 0, spaces: [], skipped: 0 };
  const touch = (spaceId: string) => {
    if (!result.spaces.includes(spaceId)) result.spaces.push(spaceId);
  };

  // Creates a folder. Only one in a folder that was already here is recorded for undo.
  async function addFolder(parent: BookmarkNode, title: string, recorded: boolean): Promise<BookmarkNode> {
    const { id } = await browser.bookmarks.create({ parentId: parent.id, title });
    if (recorded) result.created.push(id);
    return { id, title, children: [] };
  }

  // A folder this import created gets every link, as it is in the file. One that was here
  // before skips the addresses it had.
  async function addLinks(folder: BookmarkNode, links: FileLink[], isNew: boolean, spaceId: string) {
    const had = new Set(isNew ? [] : (folder.children ?? []).filter(isLink).map((link) => normal(link.url)));
    for (const link of links) {
      // Only web pages, as when adding a link on the page. A file can come from anywhere.
      const url = toWebUrl(link.url);
      if (!url) {
        result.skipped++;
        continue;
      }
      if (had.has(normal(url))) continue;
      try {
        const { id } = await browser.bookmarks.create({ parentId: folder.id, title: link.title, url });
        if (!isNew) result.created.push(id);
        result.links++;
        touch(spaceId);
      } catch {
        result.skipped++;
      }
    }
  }

  const spaces = (workspace.children ?? []).filter(isFolder);
  for (const space of file.spaces) {
    const match = mode === 'merge' ? spaces.find((other) => sameName(nameOf(other.title), nameOf(space.title))) : undefined;
    const target = match ?? (await addFolder(workspace, freeTitle(space.title, spaces), true));
    if (!match) {
      spaces.push(target);
      touch(target.id);
    }
    await addLinks(target, space.loose, !match, target.id);

    const categories = (target.children ?? []).filter(isFolder);
    for (const category of space.categories) {
      // In a new space, every category in the file is new too, even two with the same name.
      const same = match && categories.find((other) => sameName(other.title, category.title));
      const into = same || (await addFolder(target, category.title, Boolean(match)));
      if (!same) {
        categories.push(into);
        touch(target.id);
      }
      await addLinks(into, category.links, !same, target.id);
    }
  }
  await addLinks(workspace, file.loose, false, workspace.id);
  return result;
}

/** Removes what an import created, skipping anything already gone. */
export async function undoImport(created: string[]) {
  for (const id of [...created].reverse()) await remove(id).catch(() => {});
}
