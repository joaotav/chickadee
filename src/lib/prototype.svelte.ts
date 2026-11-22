// PROTOTYPE for moving categories and links to another space (#59). Throwaway: it lives only
// on the prototype/move-to branch.

export const VARIANTS = {
  a: { name: 'In the menu', hint: 'Move to… swaps the ⋯ menu for the list of places' },
  b: { name: 'Dropdown', hint: 'A box under the card or link with a dropdown, Move and Cancel' },
  c: { name: 'Searchable list', hint: 'A box with a search field above the list of places' },
} as const;

export type Variant = keyof typeof VARIANTS;

const saved = localStorage.getItem('prototype:move-to');

export const proto = $state({
  variant: (saved && saved in VARIANTS ? saved : 'a') as Variant,
});
