import type { Page } from '@playwright/test';
import { addBookmarks, expect, test, type Seed } from './fixtures';

const sample: Seed[] = [
  {
    title: '💼 Work',
    children: [
      { title: 'Repos', children: [{ title: 'GitHub', url: 'https://github.com/' }, { title: 'GitLab', url: 'https://gitlab.com/' }] },
      { title: 'Docs', children: [{ title: 'MDN', url: 'https://developer.mozilla.org/' }] },
    ],
  },
  { title: '🏠 Home', children: [{ title: 'Media', children: [{ title: 'YouTube', url: 'https://www.youtube.com/' }] }] },
];

/** Titles of the items directly in a folder, as the browser's bookmark manager shows them. */
const childTitles = (page: Page, id: string) =>
  page.evaluate(async (id) => (await chrome.bookmarks.getChildren(id)).map((node) => node.title), id);

test('moves a category to another space with its links and collapse state, and Undo puts it back', async ({ dashboard }) => {
  const ids = await addBookmarks(dashboard, sample);
  await dashboard.getByRole('button', { name: /^Repos/ }).click();
  await dashboard.getByRole('button', { name: 'Actions for Repos' }).click();
  await dashboard.getByRole('button', { name: 'Move to…' }).click();
  await dashboard.getByRole('button', { name: '🏠 Home' }).click();

  await expect(dashboard.getByRole('status')).toHaveText(/Moved “Repos” to 🏠 Home/);
  await expect(dashboard.getByRole('heading', { level: 2 })).toHaveText([/Docs/]);
  expect(await childTitles(dashboard, ids['🏠 Home']!)).toEqual(['Media', 'Repos']);
  expect(await childTitles(dashboard, ids['Repos']!)).toEqual(['GitHub', 'GitLab']);
  await dashboard.getByRole('tab', { name: /Home/ }).click();
  await expect(dashboard.getByRole('button', { name: /^Repos/ })).toHaveAttribute('aria-expanded', 'false');

  await dashboard.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => childTitles(dashboard, ids['💼 Work']!)).toEqual(['Repos', 'Docs']);
  expect(await childTitles(dashboard, ids['🏠 Home']!)).toEqual(['Media']);
});

test('asks before merging into a category of the same name, and Undo puts both back', async ({ dashboard }) => {
  const ids = await addBookmarks(dashboard, [
    sample[0]!,
    { title: '🏠 Home', children: [{ title: 'repos', children: [{ title: 'Codeberg', url: 'https://codeberg.org/' }] }] },
  ]);
  const moveRepos = async () => {
    await dashboard.getByRole('button', { name: 'Actions for Repos' }).click();
    await dashboard.getByRole('button', { name: 'Move to…' }).click();
    await dashboard.getByRole('button', { name: '🏠 Home' }).click();
  };

  // Cancel leaves everything where it was.
  await moveRepos();
  const question = dashboard.getByRole('group', { name: 'Merge Repos' });
  await expect(question).toContainText('Merge with 🏠 Home › repos?');
  await expect(question).toContainText('Home already has a category with this name.');
  await question.getByRole('button', { name: 'Cancel' }).click();
  await expect(question).toBeHidden();
  expect(await childTitles(dashboard, ids['💼 Work']!)).toEqual(['Repos', 'Docs']);

  await moveRepos();
  await question.getByRole('button', { name: 'Merge' }).click();
  await expect(dashboard.getByRole('status')).toHaveText(/Merged “Repos” into 🏠 Home › repos/);
  await expect.poll(() => childTitles(dashboard, ids['💼 Work']!)).toEqual(['Docs']);
  expect(await childTitles(dashboard, ids['repos']!)).toEqual(['Codeberg', 'GitHub', 'GitLab']);

  await dashboard.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => childTitles(dashboard, ids['💼 Work']!)).toEqual(['Repos', 'Docs']);
  expect(await childTitles(dashboard, ids['repos']!)).toEqual(['Codeberg']);
  await expect(dashboard.getByRole('heading', { level: 2 })).toHaveText([/Repos\s*2/, /Docs/]);
});

test('moves a link to a category in another space from the keyboard, and Undo puts it back', async ({ dashboard }) => {
  const ids = await addBookmarks(dashboard, sample);
  await dashboard.getByRole('link', { name: 'GitHub' }).hover();
  await dashboard.getByRole('button', { name: 'Actions for GitHub' }).click();
  await dashboard.getByRole('button', { name: 'Move to…' }).click();
  const search = dashboard.getByRole('textbox', { name: 'Search places' });
  await expect(search).toBeFocused();

  // Searching narrows the list without changing its width.
  const menu = search.locator('xpath=ancestor::div[contains(@class, "items")]');
  const width = (await menu.boundingBox())!.width;
  await search.fill('home');
  expect((await menu.boundingBox())!.width).toBe(width);
  await expect(menu.getByRole('button')).toHaveText(['‹ Move to', 'Media']);
  await search.press('Enter');

  await expect(dashboard.getByRole('status')).toHaveText(/Moved “GitHub” to 🏠 Home › Media/);
  expect(await childTitles(dashboard, ids['Repos']!)).toEqual(['GitLab']);
  expect(await childTitles(dashboard, ids['Media']!)).toEqual(['YouTube', 'GitHub']);

  await dashboard.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => childTitles(dashboard, ids['Repos']!)).toEqual(['GitHub', 'GitLab']);
  expect(await childTitles(dashboard, ids['Media']!)).toEqual(['YouTube']);
});
