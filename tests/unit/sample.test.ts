import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { getWorkspace } from '@/lib/bookmarks';
import { addSample } from '@/lib/sample';
import { placesOf, toSpaces } from '@/lib/tree';
import { installFakeBookmarks } from '../fixtures/fake-bookmarks';
import { firefoxRoot } from '../fixtures/trees';

beforeEach(() => {
  fakeBrowser.reset();
  installFakeBookmarks(firefoxRoot());
});

const spaces = async () => toSpaces(await getWorkspace());

describe('addSample', () => {
  it('fills the Workspace with a few spaces that cover the awkward cases', async () => {
    await addSample('few');
    const sample = await spaces();
    const categories = sample.flatMap((space) => space.categories);
    expect(sample.length).toBeGreaterThan(2);
    expect(sample.some((space) => space.emoji === null)).toBe(true);
    expect(sample.some((space) => space.categories.length === 0 && space.unsorted.length === 0)).toBe(true);
    expect(sample.some((space) => space.unsorted.length > 0)).toBe(true);
    expect(categories.some((category) => category.links.length === 0)).toBe(true);
    expect(categories.some((category) => category.links.length > 10)).toBe(true);
    expect(placesOf(sample, 'https://developer.mozilla.org/')).toHaveLength(2);
  });

  it('fills the Workspace with many spaces, categories and links', async () => {
    await addSample('many');
    const sample = await spaces();
    const categories = sample.flatMap((space) => space.categories);
    expect(sample.length).toBeGreaterThanOrEqual(15);
    expect(sample.some((space) => space.categories.length > 20)).toBe(true);
    expect(categories.some((category) => category.links.length >= 100)).toBe(true);
    expect(categories.flatMap((category) => category.links).length).toBeGreaterThan(500);
  });

  it('adds the whole set again on each call', async () => {
    await addSample('few');
    const once = (await spaces()).map((space) => space.name);
    await addSample('few');
    expect((await spaces()).map((space) => space.name)).toEqual([...once, ...once]);
  });
});
