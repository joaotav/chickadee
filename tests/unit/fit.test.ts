import { describe, expect, it } from 'vitest';
import { fitTabs } from '@/lib/fit';

// Five tabs of 100 pixels, 2 apart, with 60 pixels for the More button.
const widths = [100, 100, 100, 100, 100];
const fit = (selected: number, room: number) => fitTabs(widths, selected, room, 60, 2);

describe('fitTabs', () => {
  it('shows every tab when they all fit', () => {
    expect(fit(0, 508)).toEqual([0, 1, 2, 3, 4]);
  });

  it('shows the tabs that fit in order, leaving room for the More button', () => {
    expect(fit(0, 507)).toEqual([0, 1, 2, 3]);
    expect(fit(0, 400)).toEqual([0, 1, 2]);
  });

  it('keeps the selected tab, in place of the last ones that fit', () => {
    expect(fit(4, 400)).toEqual([0, 1, 4]);
    expect(fitTabs([100, 100, 100, 250], 3, 420, 60, 2)).toEqual([0, 3]);
  });

  it('keeps only the selected tab when nothing else fits', () => {
    expect(fit(2, 50)).toEqual([2]);
    expect(fit(-1, 50)).toEqual([]);
  });
});
