import { addBookmarks, expect, test } from './fixtures';

test('marks links saved more than once, lists the other places, and drops the marks when one copy is left', async ({ dashboard }) => {
  await addBookmarks(dashboard, [
    {
      title: '💼 Work',
      children: [
        { title: 'Repos', children: [{ title: 'GitHub', url: 'https://github.com/' }, { title: 'GitLab', url: 'https://gitlab.com/' }] },
        { title: 'Docs', children: [{ title: 'GitHub', url: 'https://github.com' }] },
      ],
    },
  ]);
  const marks = dashboard.getByRole('button', { name: 'Saved 2 times' });
  await expect(marks).toHaveCount(2);

  await marks.first().click();
  await expect(dashboard.getByText('💼 Work › Docs', { exact: true })).toBeVisible();
  await dashboard.keyboard.press('Escape');
  await expect(dashboard.getByText('Also saved in')).toBeHidden();

  const docs = dashboard.locator('section', { has: dashboard.getByRole('heading', { name: /^Docs/ }) });
  await docs.getByRole('button', { name: 'Actions for GitHub' }).click();
  await dashboard.getByRole('button', { name: 'Delete' }).click();
  await expect(marks).toHaveCount(0);
});

test('the settings can turn the marks off', async ({ dashboard }) => {
  await addBookmarks(dashboard, [
    { title: 'Work', children: [{ title: 'Repos', children: [{ title: 'GitHub', url: 'https://github.com/' }, { title: 'GitHub', url: 'https://github.com/' }] }] },
  ]);
  await expect(dashboard.getByRole('button', { name: 'Saved 2 times' })).toHaveCount(2);
  await dashboard.getByRole('button', { name: 'Settings' }).click();
  await dashboard.getByRole('dialog', { name: 'Settings' }).getByRole('radio', { name: 'Don’t mark' }).check();
  await expect(dashboard.getByRole('button', { name: /^Saved/ })).toHaveCount(0);
});
