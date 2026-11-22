import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { getIcons, getLastCategoryId } from '@/lib/meta';
import { saveSession, sessionName, windowPages } from '@/lib/session';
import { installFakeBookmarks } from '../fixtures/fake-bookmarks';
import { firefoxRoot, folder } from '../fixtures/trees';

beforeEach(() => fakeBrowser.reset());
afterEach(() => vi.unstubAllEnvs());

describe('windowPages', () => {
  it('lists the web pages in the current window in tab order, leaving out pinned tabs and other pages', async () => {
    const query = vi.spyOn(fakeBrowser.tabs, 'query').mockResolvedValue([
      { url: 'https://mail.example/', title: 'Mail', pinned: true },
      { url: 'https://github.com/', title: 'GitHub', pinned: false, favIconUrl: 'https://github.com/favicon.ico' },
      { url: 'about:preferences', title: 'Settings', pinned: false },
      { url: 'moz-extension://abc/newtab.html', title: 'New Tab', pinned: false },
      { url: 'http://localhost:5173/', title: '', pinned: false },
    ] as never);
    expect(await windowPages()).toEqual([
      { url: 'https://github.com/', title: 'GitHub', favIconUrl: 'https://github.com/favicon.ico' },
      { url: 'http://localhost:5173/', title: 'http://localhost:5173/' },
    ]);
    expect(query).toHaveBeenCalledWith({ currentWindow: true });
  });
});

describe('sessionName', () => {
  it('names the session after the date and time', () => {
    const date = new Date(2026, 10, 22, 14, 30);
    const day = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    expect(sessionName(date)).toBe(`Session ${day}, ${time}`);
  });
});

describe('saveSession', () => {
  const setup = () => {
    const root = firefoxRoot();
    root.children![2]!.children!.push(folder('w', 'Workspace', [folder('s1', 'Work', [folder('c1', 'Repos')])]));
    return installFakeBookmarks(root);
  };
  const pages = [
    { url: 'https://github.com/', title: 'GitHub', favIconUrl: 'https://github.com/favicon.ico' },
    { url: 'https://svelte.dev/', title: 'Svelte' },
  ];

  it('adds a category at the end of the space with one link per page, in order', async () => {
    const { find } = setup();
    const id = await saveSession('s1', 'Session 22 Nov, 14:30', pages);
    expect(find('s1')!.children!.map((node) => node.title)).toEqual(['Repos', 'Session 22 Nov, 14:30']);
    expect(find(id)!.children!.map(({ title, url }) => ({ title, url }))).toEqual([
      { title: 'GitHub', url: 'https://github.com/' },
      { title: 'Svelte', url: 'https://svelte.dev/' },
    ]);
  });

  it('keeps the icons in Firefox, and leaves the popup\'s last category alone', async () => {
    vi.stubEnv('BROWSER', 'firefox');
    const { find } = setup();
    const id = await saveSession('s1', 'Session', pages);
    const github = find(id)!.children![0]!.id;
    expect(await getIcons()).toEqual(new Map([[github, 'https://github.com/favicon.ico']]));
    expect(await getLastCategoryId()).toBeUndefined();
  });
});
