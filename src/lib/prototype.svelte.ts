// PROTOTYPE for the bookmark grip's highlight (#72). Throwaway: it lives only on the
// prototype/link-grip branch.

export const VARIANTS = {
  a: { name: 'Today', hint: 'Only the grip box stays lit, ending at the title' },
  b: { name: 'Row stays lit', hint: 'The whole row stays lit; the dots brighten' },
  c: { name: 'Smaller grip box', hint: 'A rounded box over the icon only, with a gap before the title' },
  d: { name: 'Both', hint: 'Row stays lit, plus a brighter rounded box around the dots' },
} as const;

export type Variant = keyof typeof VARIANTS;

const saved = localStorage.getItem('prototype:link-grip');

export const proto = $state({
  variant: (saved && saved in VARIANTS ? saved : 'b') as Variant,
});
