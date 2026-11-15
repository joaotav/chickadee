// PROTOTYPE for the space tabs not fitting in the top bar. Throwaway: it lives only on the
// prototype/tab-overflow branch.

export const VARIANTS = {
  a: { name: 'More menu', hint: 'Tabs that don’t fit go in a menu at the end of the bar' },
  b: { name: 'Tab bar scrolls', hint: 'Scroll the tabs with the mouse wheel; ▾ lists every space' },
  c: { name: 'Tabs wrap', hint: 'Tabs that don’t fit go on a second row' },
  d: { name: 'Today: page scrolls sideways', hint: 'As now, apart from the … on long names' },
} as const;

export type Variant = keyof typeof VARIANTS;

const saved = localStorage.getItem('prototype:tab-overflow');

export const proto = $state({ variant: (saved && saved in VARIANTS ? saved : 'a') as Variant });
