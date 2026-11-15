import { create, ensureRoot } from '@/lib/bookmarks';

/** A bookmark to create: a folder when it has `children`, a link when it has a `url`. */
interface Sample {
  title: string;
  url?: string;
  children?: Sample[];
}

const link = (title: string, url: string): Sample => ({ title, url });

// Sample bookmarks for trying changes by hand. Only development builds offer them, from the
// settings panel, which loads this file on demand so releases leave it out. The set covers the
// awkward cases: long names, empty spaces and categories, a category with more than 10 links,
// a folder inside a category, links directly in a space, and a page saved in two places.
const SAMPLE: Sample[] = [
  {
    title: '💼 Work',
    children: [
      {
        title: 'Repos',
        children: [
          link('GitHub', 'https://github.com/'),
          link('Codeberg', 'https://codeberg.org/'),
          { title: 'Archived', children: [link('SourceHut', 'https://sr.ht/'), link('GitLab', 'https://gitlab.com/')] },
        ],
      },
      {
        title: 'Docs',
        children: [
          link('MDN Web Docs', 'https://developer.mozilla.org/'),
          link('Svelte', 'https://svelte.dev/docs'),
          link('TypeScript Handbook', 'https://www.typescriptlang.org/docs/handbook/intro.html'),
          link('WXT', 'https://wxt.dev/'),
        ],
      },
      {
        title: 'Daily reading',
        children: [
          link('Hacker News', 'https://news.ycombinator.com/'),
          link('Lobsters', 'https://lobste.rs/'),
          link('Ars Technica', 'https://arstechnica.com/'),
          link('Quanta Magazine', 'https://www.quantamagazine.org/'),
          link('xkcd', 'https://xkcd.com/'),
          link('Smashing Magazine', 'https://www.smashingmagazine.com/'),
          link('CSS-Tricks', 'https://css-tricks.com/'),
          link('web.dev', 'https://web.dev/'),
          link('LWN.net', 'https://lwn.net/'),
          link('The Register', 'https://www.theregister.com/'),
          link('Wikipedia', 'https://en.wikipedia.org/wiki/Main_Page'),
          link('Nature', 'https://www.nature.com/'),
        ],
      },
      { title: 'Empty category', children: [] },
    ],
  },
  {
    title: '🏠 Home',
    children: [
      link('A link directly in the space, shown as Unsorted', 'https://example.com/'),
      {
        title: 'Media',
        children: [link('YouTube', 'https://www.youtube.com/'), link('PeerTube', 'https://joinpeertube.org/')],
      },
      {
        title: 'Recipes and cooking ideas for the weekend, with a name long enough to wrap',
        children: [
          link(
            'A very long bookmark title that goes on and on to show how titles wrap or get cut off in a card',
            'https://en.wikipedia.org/wiki/List_of_cooking_techniques?section=a-rather-long-query-string&another=value',
          ),
          link('', 'https://www.bbcgoodfood.com/'),
        ],
      },
    ],
  },
  {
    title: '📚 Research and reading for a long project with a long name',
    children: [
      {
        title: 'References',
        children: [
          // Also in Work › Docs, so the popup says where else it's saved.
          link('MDN Web Docs', 'https://developer.mozilla.org/'),
          link('arXiv', 'https://arxiv.org/'),
        ],
      },
    ],
  },
  { title: 'Space without an emoji', children: [{ title: 'Misc', children: [link('Example', 'https://example.org/')] }] },
  { title: '🗂️ Empty space', children: [] },
];

/** Adds the whole sample set under Workspace, next to whatever is there. */
export async function addSample(): Promise<void> {
  const add = async (samples: Sample[], parentId: string) => {
    for (const sample of samples) {
      const id = await create(parentId, sample.title, sample.url);
      if (sample.children) await add(sample.children, id);
    }
  };
  await add(SAMPLE, await ensureRoot());
}
