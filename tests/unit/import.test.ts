import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { BookmarksFile } from '@/lib/bookmarks-file';
import { importFile, takenSpaces, undoImport } from '@/lib/import';
import type { BookmarkNode } from '@/lib/node';
import { installFakeBookmarks } from '../fixtures/fake-bookmarks';
import { firefoxRoot, folder, link } from '../fixtures/trees';

/** Titles of a subtree, nested the same way, so tests can compare structure but not IDs. */
const shape = (node: BookmarkNode): unknown => (node.children ? [node.title, node.children.map(shape)] : node.title);

const setup = () => {
  const root = firefoxRoot();
  root.children![2]!.children!.push(
    folder('w', 'Workspace', [
      folder('s1', '💼 Work', [folder('c1', 'Repos', [link('l1', 'GitHub', 'https://github.com/')]), link('l2', 'Loose', 'https://example.com/loose')]),
      folder('s2', 'Home', []),
      link('l3', 'Stray', 'https://example.com/stray'),
    ]),
  );
  const fake = installFakeBookmarks(root);
  const workspace = async () => (await browser.bookmarks.getSubTree('w'))[0]!;
  return { ...fake, workspace, tree: async () => shape(await workspace()) };
};

const file: BookmarksFile = {
  loose: [
    { title: 'Stray again', url: 'https://example.com/stray' },
    { title: 'Top', url: 'https://example.com/top' },
  ],
  spaces: [
    {
      title: '🛠️ work',
      loose: [{ title: 'Loose', url: 'https://example.com/loose' }],
      categories: [
        {
          title: 'repos',
          links: [
            { title: 'GitHub again', url: 'https://github.com' },
            { title: 'GitLab', url: 'https://gitlab.com/' },
          ],
        },
        { title: 'Docs', links: [{ title: 'MDN', url: 'https://developer.mozilla.org/' }] },
      ],
    },
    { title: 'Reading', loose: [], categories: [{ title: 'Later', links: [{ title: 'Article', url: 'https://example.com/a' }] }] },
  ],
};

beforeEach(() => fakeBrowser.reset());

describe('takenSpaces', () => {
  it('lists the spaces already here, by their names here, ignoring the icon and letter case', () => {
    expect(takenSpaces(file, ['Work', 'Home'])).toEqual(['Work']);
    expect(takenSpaces({ loose: [], spaces: [{ title: 'Elsewhere', loose: [], categories: [] }] }, ['Work'])).toEqual([]);
  });
});

describe('importFile', () => {
  it('merges spaces and categories with the same names, skipping links already there', async () => {
    const { workspace, tree } = setup();
    const result = await importFile(file, await workspace(), 'merge');
    expect(await tree()).toEqual([
      'Workspace',
      [
        ['💼 Work', [['Repos', ['GitHub', 'GitLab']], 'Loose', ['Docs', ['MDN']]]],
        ['Home', []],
        'Stray',
        ['Reading', [['Later', ['Article']]]],
        'Top',
      ],
    ]);
    expect(result.links).toBe(4);
    expect(result.spaces).toEqual(['s1', result.created[2], 'w']);
    expect(result.skipped).toBe(0);
  });

  it('adds nothing when the same file is imported again', async () => {
    const { workspace, tree } = setup();
    await importFile(file, await workspace(), 'merge');
    const before = await tree();
    const again = await importFile(file, await workspace(), 'merge');
    expect(await tree()).toEqual(before);
    expect(again).toEqual({ created: [], links: 0, spaces: [], skipped: 0 });
  });

  it('keeps spaces separate with a number after a taken name, and the file icon', async () => {
    const { workspace, tree } = setup();
    await importFile(file, await workspace(), 'separate');
    await importFile(file, await workspace(), 'separate');
    const spaces = ((await tree()) as [string, unknown[]])[1].filter(Array.isArray).map(([title]) => title);
    expect(spaces).toEqual(['💼 Work', 'Home', '🛠️ work (2)', 'Reading', '🛠️ work (3)', 'Reading (2)']);
  });

  it('recreates a new space as it is in the file, even links that appear twice', async () => {
    const { workspace, tree } = setup();
    const twice = { title: 'Same', url: 'https://example.com/same' };
    await importFile({ loose: [], spaces: [{ title: 'New', loose: [], categories: [{ title: 'Pair', links: [twice, twice] }, { title: 'Empty', links: [] }] }] }, await workspace(), 'merge');
    expect(((await tree()) as [string, unknown[]])[1].at(-1)).toEqual(['New', [['Pair', ['Same', 'Same']], ['Empty', []]]]);
  });

  it('leaves out links that are not web pages, counting them', async () => {
    const { workspace, tree } = setup();
    const result = await importFile(
      { loose: [{ title: 'Bookmarklet', url: 'javascript:alert(1)' }, { title: 'Mail', url: 'mailto:someone@example.com' }, { title: 'Web', url: 'https://example.com/web' }], spaces: [] },
      await workspace(),
      'merge',
    );
    expect(result).toMatchObject({ links: 1, skipped: 2 });
    expect(((await tree()) as [string, unknown[]])[1].at(-1)).toBe('Web');
  });

  it('counts the links the browser refuses, and goes on with the rest', async () => {
    const { workspace } = setup();
    const create = browser.bookmarks.create;
    vi.spyOn(browser.bookmarks, 'create').mockImplementation(async (details) => {
      if (details.url?.includes('gitlab')) throw new Error('Invalid URL');
      return create(details);
    });
    const result = await importFile(file, await workspace(), 'merge');
    expect(result.skipped).toBe(1);
    expect(result.links).toBe(3);
  });
});

describe('undoImport', () => {
  it('removes everything the import added, and nothing else', async () => {
    const { workspace, tree } = setup();
    const before = await tree();
    const result = await importFile(file, await workspace(), 'merge');
    await undoImport(result.created);
    expect(await tree()).toEqual(before);
  });

  it('skips what is already gone', async () => {
    const { workspace, tree } = setup();
    const before = await tree();
    const result = await importFile(file, await workspace(), 'separate');
    await browser.bookmarks.removeTree(result.created[0]!);
    await undoImport(result.created);
    expect(await tree()).toEqual(before);
  });
});
