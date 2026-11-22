import type { Page } from '@playwright/test';
import { addBookmarks, expect, test, type Seed } from './fixtures';

const sample: Seed[] = [
  {
    title: '💼 Work',
    children: [
      { title: 'Repos', children: [{ title: 'GitHub', url: 'https://github.com/' }] },
      { title: 'Docs', children: [] },
    ],
  },
  { title: 'Home', children: [{ title: 'Media', children: [] }] },
];

const gitlab = { url: 'https://gitlab.com/explore', title: 'Explore · GitLab' };

/** Titles of the links directly in a folder, as the browser's bookmark manager shows them. */
const childTitles = (page: Page, id: string) =>
  page.evaluate(async (id) => (await chrome.bookmarks.getChildren(id)).map((node) => node.title), id);

test('saves the current page into a category, and an open new tab shows it', async ({ dashboard, popup }) => {
  const ids = await addBookmarks(dashboard, sample);
  const page = await popup(gitlab);
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Explore · GitLab');
  await expect(page.getByRole('textbox', { name: 'URL' })).toHaveValue('https://gitlab.com/explore');

  await page.getByRole('textbox', { name: 'Title' }).fill('GitLab');
  await page.getByRole('combobox', { name: 'Category' }).selectOption({ label: 'Docs' });
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved GitLab in 💼 Work › Docs');

  expect(await childTitles(dashboard, ids['Docs']!)).toEqual(['GitLab']);
  await expect(dashboard.getByRole('list', { name: 'Links in Docs' }).getByRole('link', { name: 'GitLab' })).toBeVisible();
});

test('a line along the bottom counts down, pausing while the pointer is over the popup', async ({ dashboard, popup }) => {
  await addBookmarks(dashboard, sample);
  const page = await popup(gitlab);
  // Moving over the form doesn't count: the line starts running once the page is saved.
  await page.mouse.move(100, 40);
  await page.mouse.move(110, 50);
  await page.getByRole('textbox', { name: 'Title' }).press('Enter');
  const line = page.locator('.countdown');
  const state = () => line.evaluate((element) => getComputedStyle(element).animationPlayState);
  await expect.poll(state).toBe('running');
  await page.mouse.move(120, 40);
  await expect.poll(state).toBe('paused');
});

test('closes after 4 seconds once saved, or at once with OK', async ({ dashboard, popup }) => {
  await addBookmarks(dashboard, sample);
  const page = await popup(gitlab);
  await page.clock.install();
  // Clicking Save leaves the pointer resting on the popup, which mustn't hold it open.
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText(/in 💼 Work › Repos/);
  await expect(page.getByRole('button', { name: 'This page' })).toHaveCount(0);
  await page.clock.runFor(3900);
  expect(page.isClosed()).toBe(false);
  const closed = page.waitForEvent('close');
  await page.clock.runFor(300);
  await closed;

  const again = await popup(gitlab);
  await again.getByRole('button', { name: 'Save' }).click();
  const closedAgain = again.waitForEvent('close');
  // A real click can fail when the page closes before Playwright's checks after it finish.
  await again.getByRole('button', { name: 'OK' }).dispatchEvent('click');
  await closedAgain;
});

test('opens on the last used category, and says where a page is already saved', async ({ dashboard, popup }) => {
  await addBookmarks(dashboard, sample);
  const first = await popup(gitlab);
  await first.getByRole('combobox', { name: 'Category' }).selectOption({ label: 'Media' });
  await first.getByRole('button', { name: 'Save' }).click();
  await expect(first.getByRole('status')).toHaveText(/in Home › Media/);

  const second = await popup({ url: 'https://github.com/', title: 'GitHub' });
  await expect(second.getByRole('combobox', { name: 'Category' }).locator('option:checked')).toHaveText('Media');
  await expect(second.getByText('Already in Work › Repos')).toBeVisible();
  await second.getByRole('button', { name: 'Save anyway' }).click();
  await expect(second.getByRole('status')).toHaveText(/in Home › Media/);
});

test('only offers to save web pages, starting on all tabs for other pages', async ({ dashboard, popup }) => {
  await addBookmarks(dashboard, sample);
  const page = await popup({ url: 'chrome://settings/', title: 'Settings' });
  await expect(page.getByRole('button', { name: 'All tabs' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('form', { name: 'Save all tabs' })).toBeVisible();
  await page.getByRole('button', { name: 'This page' }).click();
  await expect(page.getByText('Only web pages can be saved.')).toBeVisible();
  await expect(page.getByRole('form')).toHaveCount(0);
});

test('asks for a category first when there are none', async ({ dashboard, popup }) => {
  await addBookmarks(dashboard, [{ title: 'Work', children: [] }]);
  const page = await popup(gitlab);
  await expect(page.getByText('Create a category on the new tab page first, then save pages into it.')).toBeVisible();
});

test('opens in the saved theme', async ({ dashboard, popup }) => {
  await addBookmarks(dashboard, sample);
  await dashboard.getByRole('button', { name: 'Settings' }).click();
  await dashboard.getByRole('radio', { name: 'Dracula' }).check();
  const page = await popup(gitlab);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
});
