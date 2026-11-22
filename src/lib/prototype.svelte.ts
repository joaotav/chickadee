// PROTOTYPE for saving all open tabs as a session (#35). Throwaway: it lives only on the
// prototype/save-session branch.

export const VARIANTS = {
  a: { name: 'Link under the form', hint: '"Save all tabs…" under the Save form' },
  b: { name: 'Tabs at the top', hint: '"This page | All tabs" switches the form' },
} as const;

export type Variant = keyof typeof VARIANTS;

const saved = localStorage.getItem('prototype:save-session');

export const proto = $state({
  variant: (saved && saved in VARIANTS ? saved : 'a') as Variant,
});

export function cycle(by: number) {
  const keys = Object.keys(VARIANTS) as Variant[];
  proto.variant = keys[(keys.indexOf(proto.variant) + by + keys.length) % keys.length]!;
  localStorage.setItem('prototype:save-session', proto.variant);
}
