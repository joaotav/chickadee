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
  it('fills the Workspace with spaces that cover the awkward cases', async () => {
    await addSample();
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

  it('adds the whole set again on each call', async () => {
    await addSample();
    const once = (await spaces()).map((space) => space.name);
    await addSample();
    expect((await spaces()).map((space) => space.name)).toEqual([...once, ...once]);
  });
});
