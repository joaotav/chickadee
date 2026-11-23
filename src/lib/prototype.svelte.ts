// PROTOTYPE for how links saved more than once are marked (#45). Throwaway: it lives only on
// the prototype/duplicate-mark branch.

export const VARIANTS = {
  a: { name: 'Count', hint: 'A “×2” pill at the end of the row; click it for the other places' },
  b: { name: 'Warning sign', hint: 'A red warning triangle at the end of the row; click it for the other places' },
  c: { name: 'Question mark', hint: 'A “?” in a circle at the end of the row; click it for the other places' },
  d: { name: 'Copy icon and count', hint: 'Two squares and “2” at the end of the row; click it for the other places' },
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
