import type { BrowserContext, Page } from '@playwright/test';
import { addBookmarks, expect, test, type Seed } from './fixtures';

const sample: Seed[] = [
  { title: '💼 Work', children: [{ title: 'Repos', children: [{ title: 'GitHub', url: 'https://github.com/' }] }] },
  { title: '🏠 Home', children: [] },
];

const tabs = [
  { url: 'https://mail.example/', title: 'Mail', pinned: true },
  { url: 'https://gitlab.com/', title: 'GitLab', pinned: false, active: true },
  { url: 'chrome://settings/', title: 'Settings', pinned: false },
  { url: 'https://svelte.dev/', title: 'Svelte', pinned: false },
];

/**
 * Opens the popup on a window with `tabs`, as the `popup` fixture does for one tab. Browsers
 * only show their permission prompt to a person, so `allow` stands in for the answer.
 */
async function popupWithTabs(context: BrowserContext, dashboard: Page, { allow, granted = false }: { allow: boolean; granted?: boolean }) {
  const page = await context.newPage();
  await page.addInitScript(
    ({ tabs, allow, granted }) => {
      chrome.tabs.query = (async ({ active }: { active?: boolean }) => (active ? tabs.filter((tab) => tab.active) : tabs)) as never;
      chrome.permissions.contains = (async () => granted) as never;
      chrome.permissions.request = (async () => allow) as never;
    },
    { tabs, allow, granted },
  );
  await page.goto(dashboard.url().replace('newtab.html', 'popup.html'));
  return page;
}

/** Titles of the items directly in a folder, as the browser's bookmark manager shows them. */
const childTitles = (page: Page, id: string) =>
  page.evaluate(async (id) => (await chrome.bookmarks.getChildren(id)).map((node) => node.title), id);

test("saves the window's web pages as a category in the chosen space, and the new tab shows it", async ({ context, dashboard }) => {
  const ids = await addBookmarks(dashboard, sample);
  const page = await popupWithTabs(context, dashboard, { allow: true });
  await page.getByRole('button', { name: 'All tabs' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Release');
  await page.getByRole('combobox', { name: 'Space' }).selectOption({ label: '🏠 Home' });
  await page.getByRole('button', { name: 'Save tabs' }).click();

  await expect(page.getByRole('status')).toHaveText('Saved Release 2 bookmarks in 🏠 Home');
  const [session] = await dashboard.evaluate(async (id) => (await chrome.bookmarks.getChildren(id)).map((node) => node.id), ids['🏠 Home']!);
  expect(await childTitles(dashboard, ids['🏠 Home']!)).toEqual(['Release']);
  expect(await childTitles(dashboard, session!)).toEqual(['GitLab', 'Svelte']);
  await dashboard.getByRole('tab', { name: /Home/ }).click();
  await expect(dashboard.getByRole('list', { name: 'Links in Release' }).getByRole('link')).toHaveText([/GitLab/, /Svelte/]);
});

test('says how many tabs it saves once the permission is granted', async ({ context, dashboard }) => {
  await addBookmarks(dashboard, sample);
  const page = await popupWithTabs(context, dashboard, { allow: true, granted: true });
  await page.getByRole('button', { name: 'All tabs' }).click();
  await expect(page.getByRole('button', { name: 'Save 2 tabs' })).toBeVisible();
});

test('saves nothing when the permission is declined, and says so', async ({ context, dashboard }) => {
  const ids = await addBookmarks(dashboard, sample);
  const page = await popupWithTabs(context, dashboard, { allow: false });
  await page.getByRole('button', { name: 'All tabs' }).click();
  await page.getByRole('button', { name: 'Save tabs' }).click();
  await expect(page.getByText('Saving all tabs needs permission to read them. Nothing was saved.')).toBeVisible();
  expect(await childTitles(dashboard, ids['💼 Work']!)).toEqual(['Repos']);
  expect(await childTitles(dashboard, ids['🏠 Home']!)).toEqual([]);
});
