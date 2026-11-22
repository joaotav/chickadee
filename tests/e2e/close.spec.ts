import { addBookmarks, expect, test } from './fixtures';

const sample = [
  {
    title: 'Work',
    children: [
      { title: 'Repos', children: [{ title: 'GitHub', url: 'https://github.com/' }] },
      { title: 'Docs', children: [{ title: 'MDN', url: 'https://developer.mozilla.org/' }] },
    ],
  },
];

test('opening something else closes the new space form, unless a name has been typed', async ({ dashboard }) => {
  await addBookmarks(dashboard, sample);
  const form = dashboard.getByRole('form', { name: 'New space' });

  await dashboard.getByRole('button', { name: 'New space' }).click();
  await dashboard.getByRole('button', { name: 'Settings' }).click();
  await expect(form).toBeHidden();
  await expect(dashboard.getByRole('dialog', { name: 'Settings' })).toBeVisible();

  await dashboard.getByRole('button', { name: 'New space' }).click();
  await expect(dashboard.getByRole('dialog', { name: 'Settings' })).toBeHidden();
  await form.getByRole('textbox', { name: 'Space name' }).fill('Launch');
  await dashboard.getByRole('button', { name: 'Settings' }).click();
  await expect(dashboard.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await expect(form).toBeVisible();
  await expect(form.getByRole('textbox', { name: 'Space name' })).toHaveValue('Launch');
});

test('only one empty add bookmark form stays open, and one with typing in it stays too', async ({ dashboard }) => {
  await addBookmarks(dashboard, sample);
  const urlFields = dashboard.getByRole('textbox', { name: 'URL' });
  const card = (category: string) => dashboard.locator('section.card').filter({ hasText: category });
  const addIn = (category: string) => card(category).getByRole('button', { name: '+ Add bookmark' });

  await addIn('Repos').click();
  await addIn('Docs').click();
  await expect(urlFields).toHaveCount(1);
  await expect(addIn('Repos')).toBeVisible();

  await urlFields.fill('example.com');
  await addIn('Repos').click();
  await expect(urlFields).toHaveCount(2);
  await expect(card('Docs').getByRole('textbox', { name: 'URL' })).toHaveValue('example.com');
});
