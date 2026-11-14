// PROTOTYPE for #48. Throwaway: it lives only on the prototype/messages branch.
// The pick is kept in localStorage, which the new tab page and the popup share, so the popup
// shows whatever was last picked on the new tab page.

export const VARIANTS = {
  a: 'Outline shrinks',
  b: 'Bar along the bottom',
  c: 'Ring around the button',
  d: 'No countdown line',
} as const;

export type Variant = keyof typeof VARIANTS;

const saved = localStorage.getItem('prototype:countdown');

export const proto = $state({ countdown: (saved && saved in VARIANTS ? saved : 'a') as Variant });
