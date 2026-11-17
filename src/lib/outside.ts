/**
 * An attachment that calls `onoutside` when a pointer is pressed anywhere outside the element,
 * including on another menu or form being opened: `{@attach outside(() => (open = false))}`.
 */
export function outside(onoutside: () => void) {
  return (element: HTMLElement) => {
    const listener = (event: PointerEvent) => {
      if (!element.contains(event.target as Node)) onoutside();
    };
    addEventListener('pointerdown', listener);
    return () => removeEventListener('pointerdown', listener);
  };
}
