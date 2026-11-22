// PROTOTYPE for picking a space's icon from every emoji (#64). Throwaway: it lives only on the
// prototype/emoji-picker branch.

export const VARIANTS = {
  a: { name: 'Replace the grid', hint: 'The picker sits in the form where the grid was' },
  b: { name: 'Button by the name', hint: 'The icon is a button next to the name that opens the picker' },
  c: { name: 'Quick picks + More…', hint: 'Two rows of quick picks, and More… opens the picker' },
  d: { name: 'In the name field', hint: 'An icon button inside the name field opens the picker over the form' },
} as const;

export type Variant = keyof typeof VARIANTS;

const saved = localStorage.getItem('prototype:emoji-picker');

export const proto = $state({
  variant: (saved && saved in VARIANTS ? saved : 'd') as Variant,
});
