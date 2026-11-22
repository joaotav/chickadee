// @vitest-environment jsdom
// Reading a file needs DOMParser, which Node lacks.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readFile, toHtml } from '@/lib/bookmarks-file';
import { folder, link, separator } from '../fixtures/trees';

// Tests run from the repository's root.
const sample = (name: string) => readFileSync(`tests/fixtures/files/${name}`, 'utf8');

describe('readFile', () => {
  it('takes the spaces from the Workspace folder in a Firefox export, flattening deeper folders', () => {
    expect(readFile(sample('firefox.html'))).toEqual({
      loose: [{ title: 'Stray', url: 'https://example.com/stray' }],
      spaces: [
        {
          title: '💼 Work',
          loose: [{ title: 'Loose in Work', url: 'https://example.com/loose' }],
          categories: [
            {
              title: 'Repos',
              links: [
                { title: 'GitHub', url: 'https://github.com/' },
                { title: 'GitLab', url: 'https://gitlab.com/' },
                { title: 'Codeberg & friends', url: 'https://codeberg.org/' },
              ],
            },
          ],
        },
        { title: 'Home', loose: [], categories: [{ title: 'Recipes', links: [] }] },
      ],
    });
  });

  it('finds the Workspace folder at the top of a Chrome export, and leaves the rest out', () => {
    expect(readFile(sample('chrome.html'))).toEqual({
      loose: [],
      spaces: [{ title: '💼 Work', loose: [], categories: [{ title: 'Repos', links: [{ title: 'GitHub', url: 'https://github.com/' }] }] }],
    });
  });

  it('makes spaces of the top folders in a file without a Workspace folder', () => {
    expect(readFile(sample('other-tool.html'))).toEqual({
      loose: [{ title: 'Top', url: 'https://example.com/top' }],
      spaces: [
        {
          title: 'Reading',
          loose: [{ title: 'An article', url: 'https://example.com/article' }],
          categories: [
            {
              title: 'Later',
              links: [
                { title: 'Deep link', url: 'https://example.com/deep' },
                { title: 'After the deep folder', url: 'https://example.com/later' },
              ],
            },
          ],
        },
      ],
    });
  });

  it('finds nothing in a file that is not a bookmarks file', () => {
    expect(readFile('<p>Hello</p>')).toEqual({ loose: [], spaces: [] });
    expect(readFile('not html at all')).toEqual({ loose: [], spaces: [] });
  });
});

describe('toHtml', () => {
  const workspace = folder('w', 'My renamed Workspace', [
    folder('s1', '💼 Work', [
      link('l0', 'Loose', 'https://example.com/loose'),
      folder('c1', 'Repos & <code>', [link('l1', 'Say "hi" <b>', 'https://example.com/?a=1&b="2"'), separator('x1')]),
      folder('c2', 'Empty', []),
    ]),
    link('l2', 'Stray', 'https://example.com/stray'),
  ]);

  it('writes a standard bookmarks file with the spaces inside a Workspace folder', () => {
    const html = toHtml(workspace);
    expect(html.startsWith('<!DOCTYPE NETSCAPE-Bookmark-file-1>')).toBe(true);
    expect(html).toContain('<DT><H3>Workspace</H3>');
    expect(html).toContain('<DT><H3>Repos &amp; &lt;code&gt;</H3>');
    expect(html).toContain('<DT><A HREF="https://example.com/?a=1&amp;b=&quot;2&quot;">Say &quot;hi&quot; &lt;b&gt;</A>');
    expect(html).not.toContain('<HR>');
  });

  it('reads back the same spaces, categories and links, in order', () => {
    expect(readFile(toHtml(workspace))).toEqual({
      loose: [{ title: 'Stray', url: 'https://example.com/stray' }],
      spaces: [
        {
          title: '💼 Work',
          loose: [{ title: 'Loose', url: 'https://example.com/loose' }],
          categories: [
            { title: 'Repos & <code>', links: [{ title: 'Say "hi" <b>', url: 'https://example.com/?a=1&b="2"' }] },
            { title: 'Empty', links: [] },
          ],
        },
      ],
    });
  });
});
