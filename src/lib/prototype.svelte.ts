// PROTOTYPE for showing the search shortcuts (#31). Throwaway: it lives only on the
// prototype/search-hints branch.

export const VARIANTS = {
  a: { name: 'Footer', hint: 'A line of key hints under the results, every time' },
  b: { name: 'On the selected result', hint: 'Hints at the end of the highlighted result' },
  c: { name: 'Footer, first 3 searches', hint: 'The footer, only until it has been seen 3 times' },
  d: { name: 'Today', hint: 'No hints, as now' },
} as const;

export type Variant = keyof typeof VARIANTS;

const saved = localStorage.getItem('prototype:search-hints');

export const proto = $state({
  variant: (saved && saved in VARIANTS ? saved : 'a') as Variant,
  // Shows ⌘ instead of Ctrl, to preview what a Mac shows.
  mac: localStorage.getItem('prototype:search-hints:mac') === 'true',
  // How many times the results have opened, for variant C.
  seen: Number(localStorage.getItem('prototype:search-hints:seen') ?? 0),
});

export const SEEN_LIMIT = 3;
