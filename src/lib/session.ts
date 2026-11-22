import { browser } from 'wxt/browser';
import { create } from './bookmarks';
import { setIcon } from './meta';
import type { Page } from './save';
import { toWebUrl } from './tree';

/** Asks for the `tabs` permission, which reading every tab's URL needs. Call it straight from a click. */
export const requestTabs = () => browser.permissions.request({ permissions: ['tabs'] });

export const hasTabs = () => browser.permissions.contains({ permissions: ['tabs'] });

/** The web pages open in the current window, in tab order, leaving out pinned tabs. */
export async function windowPages(): Promise<Page[]> {
  const tabs = await browser.tabs.query({ currentWindow: true });
  return tabs
    .filter((tab) => !tab.pinned && tab.url && /^https?:/.test(tab.url) && toWebUrl(tab.url))
    .map((tab) => ({ url: tab.url!, title: tab.title || tab.url!, ...(tab.favIconUrl && { favIconUrl: tab.favIconUrl }) }));
}

/** A name for a session saved now, like "Session 22 Nov, 14:30". */
export function sessionName(date = new Date()): string {
  const day = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `Session ${day}, ${time}`;
}

/** Saves `pages` as a new category at the end of a space. Returns the category's ID. */
export async function saveSession(spaceId: string, name: string, pages: Page[]): Promise<string> {
  const categoryId = await create(spaceId, name);
  for (const { url, title, favIconUrl } of pages) {
    const id = await create(categoryId, title, url);
    // Firefox can't look up favicons later, as in savePage.
    if (import.meta.env.BROWSER === 'firefox' && favIconUrl && /^(https:|data:image\/)/.test(favIconUrl)) await setIcon(id, favIconUrl);
  }
  return categoryId;
}
