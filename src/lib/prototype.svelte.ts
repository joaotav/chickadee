// PROTOTYPE for searching space and category names (#43). Throwaway: it lives only on the
// prototype/search-places branch.

export const VARIANTS = {
  a: { name: 'Links inside', hint: 'A space or category name finds the links in it, after links whose title matches' },
  b: { name: 'Places, mixed in', hint: 'Spaces and categories are results of their own, ranked with the links' },
  c: { name: 'Places, grouped above', hint: 'Spaces and categories are listed above the links' },
  d: { name: 'Grouped, plus links inside', hint: 'C, and the links below also include those in matching places' },
} as const;

export type Variant = keyof typeof VARIANTS;

const saved = localStorage.getItem('prototype:search-places');

export const proto = $state({
  variant: (saved && saved in VARIANTS ? saved : 'a') as Variant,
});
