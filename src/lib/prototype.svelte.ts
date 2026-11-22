// PROTOTYPE for the popup's "Saved to …" message. Throwaway: it lives only on the
// prototype/saved-message branch.

export const VARIANTS = {
  a: { name: 'Today', hint: 'One line and OK' },
  b: { name: 'Check badge', hint: 'A large check, "Saved", and where it went' },
  c: { name: 'Bookmark card', hint: 'The saved bookmark as it looks on the new tab page, and where it went' },
  d: { name: 'Both', hint: 'The check badge above the bookmark card' },
} as const;

export type Variant = keyof typeof VARIANTS;

const saved = localStorage.getItem('prototype:saved-message');

export const proto = $state({
  variant: (saved && saved in VARIANTS ? saved : 'b') as Variant,
});

export function cycle(by: number) {
  const keys = Object.keys(VARIANTS) as Variant[];
  proto.variant = keys[(keys.indexOf(proto.variant) + by + keys.length) % keys.length]!;
  localStorage.setItem('prototype:saved-message', proto.variant);
}
