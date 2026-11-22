import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { addBookmarks, expect, test, type Seed } from './fixtures';

const sample: Seed[] = [
  {
    title: '💼 Work',
    children: [
      { title: 'Loose', url: 'https://example.com/loose' },
      { title: 'Repos', children: [{ title: 'GitHub', url: 'https://github.com/' }, { title: 'GitLab', url: 'https://gitlab.com/' }] },
      { title: 'Empty', children: [] },
    ],
  },
  { title: 'Home', children: [{ title: 'Media', children: [{ title: 'YouTube', url: 'https://www.youtube.com/' }] }] },
  { title: 'Stray', url: 'https://example.com/stray' },
];

/** The Workspace as nested titles, with each link's address, as the bookmark manager has it. */
const workspace = (page: Page) =>
  page.evaluate(async () => {
    type Node = { title: string; url?: string; children?: Node[] };
    const shape = (node: Node): unknown => (node.children ? [node.title, node.children.map(shape)] : `${node.title} ${node.url}`);
    const id = (await chrome.storage.local.get('workspaceRootId')).workspaceRootId as string;
    return shape((await chrome.bookmarks.getSubTree(id))[0]!);
  });

/** Picks a file for Import… in the settings panel, or the empty page's Import bookmarks…. */
async function importFrom(page: Page, button: string, file: { name: string; buffer: Buffer }) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: button }).click();
  await (await chooser).setFiles({ ...file, mimeType: 'text/html' });
}

const settings = async (page: Page) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  return page.getByRole('dialog', { name: 'Settings' });
};

const firefoxExport = { name: 'bookmarks.html', buffer: readFileSync('tests/fixtures/files/firefox.html') };

test('exports the Workspace, and importing the file into an empty one recreates it', async ({ dashboard }) => {
  await addBookmarks(dashboard, sample);
  await expect(dashboard.getByRole('tab', { name: /Work/ })).toBeVisible();
  const before = await workspace(dashboard);

  const download = dashboard.waitForEvent('download');
  await (await settings(dashboard)).getByRole('button', { name: 'Export' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^chickadee-bookmarks-\d{4}-\d{2}-\d{2}\.html$/);
  const buffer = readFileSync((await file.path())!);

  // Empty the Workspace, then bring everything back from the empty page.
  await dashboard.evaluate(async () => {
    const id = (await chrome.storage.local.get('workspaceRootId')).workspaceRootId as string;
    for (const child of await chrome.bookmarks.getChildren(id)) await chrome.bookmarks.removeTree(child.id);
  });
  await expect(dashboard.getByText('Your workspace is empty.')).toBeVisible();
  await importFrom(dashboard, 'Import bookmarks…', { name: file.suggestedFilename(), buffer });

  await expect(dashboard.getByRole('status')).toHaveText(/Imported 5 bookmarks in 3 spaces/);
  expect(await workspace(dashboard)).toEqual(before);
  await expect(dashboard.getByRole('tab', { name: /Work/ })).toHaveAttribute('aria-selected', 'true');
});

const mine: Seed[] = [{ title: 'work', children: [{ title: 'repos', children: [{ title: 'GitHub', url: 'https://github.com/' }] }] }];

test('asks before merging into spaces already here, and adds nothing the second time', async ({ dashboard }) => {
  await addBookmarks(dashboard, mine);
  await expect(dashboard.getByRole('tab', { name: 'work' })).toBeVisible();

  const panel = await settings(dashboard);
  await importFrom(dashboard, 'Import…', firefoxExport);
  const question = panel.getByRole('group', { name: 'Import' });
  await expect(question).toContainText('“work” is already here.');
  await question.getByRole('button', { name: 'Merge' }).click();
  await expect(panel).toBeHidden();

  // Firefox's export holds the Workspace inside Other Bookmarks. The rest of the file stays out.
  await expect(dashboard.getByRole('status')).toHaveText(/Imported 4 bookmarks in 3 spaces/);
  expect(await workspace(dashboard)).toEqual([
    'Workspace',
    [
      [
        'work',
        [
          ['repos', ['GitHub https://github.com/', 'GitLab https://gitlab.com/', 'Codeberg & friends https://codeberg.org/']],
          'Loose in Work https://example.com/loose',
        ],
      ],
      ['Home', [['Recipes', []]]],
      'Stray https://example.com/stray',
    ],
  ]);

  await settings(dashboard);
  await importFrom(dashboard, 'Import…', firefoxExport);
  await dashboard.getByRole('button', { name: 'Merge' }).click();
  await expect(dashboard.getByRole('status')).toContainText('Everything in this file is already here');
});

test('Undo removes only what the import added, merged or kept separate', async ({ dashboard }) => {
  await addBookmarks(dashboard, mine);
  await expect(dashboard.getByRole('tab', { name: 'work' })).toBeVisible();
  const before = await workspace(dashboard);

  await settings(dashboard);
  await importFrom(dashboard, 'Import…', firefoxExport);
  await dashboard.getByRole('button', { name: 'Merge' }).click();
  await dashboard.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => workspace(dashboard)).toEqual(before);

  await settings(dashboard);
  await importFrom(dashboard, 'Import…', firefoxExport);
  await dashboard.getByRole('button', { name: 'Keep separate' }).click();
  await expect(dashboard.getByRole('tab', { name: '💼 Work (2)' })).toHaveAttribute('aria-selected', 'true');
  await dashboard.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => workspace(dashboard)).toEqual(before);
});

test('says so when a file has no bookmarks in it', async ({ dashboard }) => {
  await importFrom(dashboard, 'Import bookmarks…', { name: 'notes.html', buffer: Buffer.from('<p>Not bookmarks</p>') });
  await expect(dashboard.getByRole('status')).toContainText('No bookmarks found in this file');
});
