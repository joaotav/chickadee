// PROTOTYPE for #25 and #50. Throwaway: it lives only on the prototype/space-actions branch.

export const VARIANTS = {
  a: { name: '⋯ in the selected tab', hint: 'Use the ⋯ inside the selected tab' },
  b: { name: 'Right-click a tab', hint: 'Right-click any tab, or focus it and press Shift+F10' },
  c: { name: 'Double-click to rename', hint: 'Double-click a tab or press F2 to rename; ⋯ in the selected tab for the rest' },
  d: { name: 'Today: ⋯ after the tabs', hint: 'Use the ⋯ after the tabs, as now' },
  e: { name: '⋯ in the selected tab, room kept', hint: 'As A, but every tab keeps room for the ⋯, so nothing moves' },
} as const;

export type Variant = keyof typeof VARIANTS;

const saved = localStorage.getItem('prototype:space-actions');

export const proto = $state({ variant: (saved && saved in VARIANTS ? saved : 'a') as Variant });
