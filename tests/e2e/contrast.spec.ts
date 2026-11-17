import type { Locator } from '@playwright/test';
import { addBookmarks, expect, test } from './fixtures';

// WCAG's relative luminance and contrast ratio, for colors like "rgb(250, 244, 237)".
const channels = (color: string) => color.match(/\d+/g)!.slice(0, 3).map(Number);
const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: number[], b: number[]) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
};
// Hovering brightens a filled button by 10%, its text included.
const brighten = (rgb: number[]) => rgb.map((value) => Math.min(255, Math.round(value * 1.1)));

async function colors(button: Locator) {
  const style = await button.evaluate((element) => getComputedStyle(element));
  return { text: channels(style.color), fill: channels(style.backgroundColor) };
}

test('filled buttons have readable text in every theme, also while hovered', async ({ dashboard }) => {
  await addBookmarks(dashboard, [{ title: 'Work', children: [{ title: 'Repos', children: [{ title: 'GitHub', url: 'https://github.com/' }] }] }]);
  // Theme changes fade, and the colors are read straight after each one.
  await dashboard.addStyleTag({ content: '* { transition: none !important; }' });

  await dashboard.getByRole('button', { name: 'Settings' }).click();
  const themes = await dashboard.locator('input[name="theme"]').evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
  await dashboard.keyboard.press('Escape');
  expect(themes).toContain('rose-pine-dawn');

  // Typing keeps the form open while the question opens.
  await dashboard.getByRole('button', { name: '+ Add bookmark' }).click();
  await dashboard.getByRole('textbox', { name: 'URL' }).fill('example.com');
  await dashboard.getByRole('button', { name: 'Actions for space Work' }).click();
  await dashboard.getByRole('button', { name: 'Delete' }).click();
  const buttons = [dashboard.getByRole('button', { name: 'Add', exact: true }), dashboard.getByRole('button', { name: 'Delete', exact: true })];

  for (const theme of themes) {
    await dashboard.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
    for (const button of buttons) {
      const { text, fill } = await colors(button);
      const name = `${await button.textContent()} in ${theme}`;
      expect(contrast(text, fill), name).toBeGreaterThanOrEqual(4.5);
      expect(contrast(brighten(text), brighten(fill)), `${name}, hovered`).toBeGreaterThanOrEqual(4.5);
    }
  }
});
