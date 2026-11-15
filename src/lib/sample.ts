import { create, ensureRoot } from '@/lib/bookmarks';

/** A bookmark to create: a folder when it has `children`, a link when it has a `url`. */
interface Sample {
  title: string;
  url?: string;
  children?: Sample[];
}

const link = (title: string, url: string): Sample => ({ title, url });

// Sample bookmarks for trying changes by hand. Only development builds offer them, from the
// settings panel, which loads this file on demand so releases leave it out. The few set covers
// the awkward cases: long names, empty spaces and categories, a category with more than 10
// links, a folder inside a category, links directly in a space, and a page saved in two places.
const FEW: Sample[] = [
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

const SITES = [
  ['GitHub', 'github.com'],
  ['MDN', 'developer.mozilla.org'],
  ['Wikipedia', 'en.wikipedia.org'],
  ['YouTube', 'www.youtube.com'],
  ['Stack Overflow', 'stackoverflow.com'],
  ['Hacker News', 'news.ycombinator.com'],
  ['arXiv', 'arxiv.org'],
  ['npm', 'www.npmjs.com'],
  ['Python docs', 'docs.python.org'],
  ['Rust', 'www.rust-lang.org'],
  ['Svelte', 'svelte.dev'],
  ['Nature', 'www.nature.com'],
  ['BBC', 'www.bbc.co.uk'],
  ['Internet Archive', 'archive.org'],
] as const;

const TOPICS = [
  'Articles', 'Tools', 'Docs', 'Videos', 'Reference', 'Inbox', 'Ideas', 'Archive',
  'Tutorials', 'News', 'Forums', 'Libraries', 'Datasets', 'Podcasts', 'Blogs', 'Talks',
  'Papers', 'Courses', 'Shops', 'Recipes', 'Maps', 'Guides', 'Templates', 'Snippets',
];

const SPACES = [
  '🔬 Research', '🛠️ Tools', '🎨 Design', '🎵 Music', '🎮 Games', '📈 Finance', '🛒 Shopping', '✈️ Travel',
  '🍳 Cooking', '🏃 Fitness', '🌱 Garden', '📚 Reading', '💼 Clients', '🎓 Courses', '🏠 House',
];

/** A category of `count` made-up pages, spread over real sites. */
function pages(title: string, count: number): Sample {
  const slug = title.toLowerCase().replaceAll(' ', '-');
  return {
    title,
    children: Array.from({ length: count }, (_, index) => {
      const [site, domain] = SITES[index % SITES.length]!;
      return link(`${title} ${index + 1} on ${site}`, `https://${domain}/${slug}/${index + 1}`);
    }),
  };
}

// The many set, for trying the page with lots of bookmarks: more spaces than fit in the tab
// bar, a space with more categories than fit on the screen, and a category with 120 links.
// About 900 links in all.
const MANY: Sample[] = [
  {
    title: '📦 Big space',
    children: [pages('Reading list', 120), ...TOPICS.map((topic, index) => pages(topic, [5, 12, 30, 8, 20, 3, 15, 45][index % 8]!))],
  },
  ...SPACES.map((title, index) => ({
    title,
    children: TOPICS.slice(index % 8, (index % 8) + 2 + (index % 3)).map((topic, offset) => pages(topic, 4 + ((index + offset) % 9))),
  })),
];

/** Adds a sample set under Workspace, next to whatever is there. */
export async function addSample(set: 'few' | 'many'): Promise<void> {
  const add = async (samples: Sample[], parentId: string) => {
    for (const sample of samples) {
      const id = await create(parentId, sample.title, sample.url);
      if (sample.children) await add(sample.children, id);
    }
  };
  await add(set === 'few' ? FEW : MANY, await ensureRoot());
}
