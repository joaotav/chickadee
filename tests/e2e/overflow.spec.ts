import { addBookmarks, expect, test, type Seed } from './fixtures';

const names = ['Work', 'Home', 'Research', 'Tools', 'Design', 'Music', 'Games', 'Finance', 'Shopping', 'Travel', 'Cooking', 'Fitness'];
const spaces: Seed[] = names.map((title) => ({ title, children: [{ title: 'Links', children: [{ title: title, url: `https://example.com/${title}` }] }] }));

test('lists the spaces that do not fit in a menu, without widening the page', async ({ dashboard }) => {
  await addBookmarks(dashboard, spaces);
  await dashboard.setViewportSize({ width: 900, height: 600 });
  const more = dashboard.getByRole('button', { name: /^\d+ more spaces$/ });
  await expect(more).toBeVisible();
  expect(await dashboard.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(900);

  // Every space is either a tab or in the menu, in order.
  const tabs = await dashboard.getByRole('tab').allTextContents();
  await more.click();
  const listed = await dashboard.getByRole('button', { name: new RegExp(`^(${names.join('|')})$`) }).allTextContents();
  expect([...tabs, ...listed].map((name) => name.trim())).toEqual(names);
  await expect(more).toHaveAccessibleName(`${listed.length} more spaces`);

  // Picking one opens it, with its tab shown.
  await dashboard.getByRole('button', { name: 'Fitness', exact: true }).click();
  await expect(dashboard.getByRole('tab', { name: 'Fitness' })).toHaveAttribute('aria-selected', 'true');
  await expect(dashboard.getByRole('link', { name: 'Fitness' })).toBeVisible();

  // A wider window shows more tabs, and one wide enough shows them all.
  const fewer = await dashboard.getByRole('tab').count();
  await dashboard.setViewportSize({ width: 1400, height: 600 });
  await expect.poll(() => dashboard.getByRole('tab').count()).toBeGreaterThan(fewer);
  await dashboard.setViewportSize({ width: 2400, height: 600 });
  await expect(dashboard.getByRole('tab')).toHaveCount(names.length);
  await expect(more).toHaveCount(0);
});

test('works out the tabs again when a space is added', async ({ dashboard }) => {
  await addBookmarks(dashboard, spaces.slice(0, 5));
  await dashboard.setViewportSize({ width: 900, height: 600 });
  await expect(dashboard.getByRole('tab')).toHaveCount(5);
  await addBookmarks(dashboard, spaces.slice(5));
  await expect(dashboard.getByRole('button', { name: /^\d+ more spaces$/ })).toBeVisible();
  expect(await dashboard.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(900);
});

test('cuts a long space name short, and shows it whole on hover', async ({ dashboard }) => {
  const long = 'Research and reading for a long project with a very long name';
  await addBookmarks(dashboard, [{ title: long, children: [] }, { title: 'Home', children: [] }]);
  const tab = dashboard.getByRole('tab', { name: long });
  expect((await tab.locator('.name').boundingBox())!.width).toBeLessThanOrEqual(200);
  await tab.hover();
  await expect(tab).toHaveAttribute('title', long);
  // A name that isn't cut has no tooltip.
  await dashboard.getByRole('tab', { name: 'Home' }).hover();
  await expect(dashboard.getByRole('tab', { name: 'Home' })).not.toHaveAttribute('title', /./);
});

test('opens a space from the menu with the keyboard', async ({ dashboard }) => {
  await addBookmarks(dashboard, spaces);
  await dashboard.setViewportSize({ width: 900, height: 600 });
  await dashboard.getByRole('button', { name: /^\d+ more spaces$/ }).focus();
  await dashboard.keyboard.press('Enter');
  await dashboard.keyboard.press('Tab');
  const first = dashboard.locator(':focus');
  const name = (await first.textContent())!.trim();
  await dashboard.keyboard.press('Enter');
  await expect(dashboard.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
});
