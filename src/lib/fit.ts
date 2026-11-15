/**
 * Which tabs to show in `room` pixels, as indexes in order. Each tab takes its width and a
 * `gap` after it. When some don't fit, `more` pixels are kept for the button that lists them,
 * and the selected tab is always shown, in place of the last ones that would fit.
 */
export function fitTabs(widths: number[], selected: number, room: number, more: number, gap: number): number[] {
  const all = widths.map((_, index) => index);
  if (widths.reduce((sum, width) => sum + width + gap, -gap) <= room) return all;
  const shown: number[] = [];
  let used = more;
  for (const index of all) {
    if (used + widths[index]! + gap > room) break;
    shown.push(index);
    used += widths[index]! + gap;
  }
  if (selected >= 0 && !shown.includes(selected)) {
    while (shown.length > 0 && used + widths[selected]! + gap > room) used -= widths[shown.pop()!]! + gap;
    shown.push(selected);
  }
  return shown;
}
