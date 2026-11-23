// PROTOTYPE for how links saved more than once are marked (#45). Throwaway: it lives only on
// the prototype/duplicate-mark branch.

export const VARIANTS = {
  a: { name: 'Count after the title', hint: 'A small “×2” pill right after the title' },
  b: { name: 'Copy icon at the end', hint: 'Two squares at the right end; the ⋯ button covers it on hover' },
  c: { name: 'Dot on the site icon', hint: 'An accent dot on the corner of the site icon' },
} as const;

export type Variant = keyof typeof VARIANTS;

const KEY = 'prototype:duplicate-mark';
let saved: string | null = null;
try {
  saved = localStorage.getItem(KEY);
} catch {
  // Storage blocked: start with A.
}

export const proto = $state({
  variant: (saved && saved in VARIANTS ? saved : 'a') as Variant,
});

export function remember(variant: Variant) {
  try {
    localStorage.setItem(KEY, variant);
  } catch {
    // Not remembered.
  }
}
