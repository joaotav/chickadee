// PROTOTYPE for how the merge question looks (#92). Throwaway: it lives only on the
// prototype/merge-question branch.

export const VARIANTS = {
  a: { name: 'End of the line', hint: 'The buttons sit at the end of the question’s last line' },
  b: { name: 'Heading and detail', hint: 'A bold question, a muted line saying why, buttons under them' },
  c: { name: 'In the menu', hint: 'The ⋯ menu stays open and asks there; the card doesn’t change' },
  d: { name: 'Full-width buttons', hint: 'The question, then Merge and Cancel side by side across the box' },
} as const;

export type Variant = keyof typeof VARIANTS;

const saved = localStorage.getItem('prototype:merge-question');

export const proto = $state({
  variant: (saved && saved in VARIANTS ? saved : 'a') as Variant,
});
