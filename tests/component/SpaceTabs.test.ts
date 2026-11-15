import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SpaceTabs from '@/components/SpaceTabs.svelte';
import type { Space } from '@/lib/tree';

const space = (id: string, name: string, emoji: string | null = null): Space => ({ id, name, emoji, unsorted: [], categories: [] });
const spaces = [space('s1', 'Work', '💼'), space('s2', 'Home')];
const props = { spaces, activeId: 's1', unsortedId: undefined, onselect: () => {}, onmove: () => {}, onrename: () => {}, ondelete: () => {} };

describe('SpaceTabs', () => {
  it('shows one tab per space, with its emoji', () => {
    render(SpaceTabs, props);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['💼 Work', 'Home']);
  });

  it('marks only the active space as selected', () => {
    render(SpaceTabs, { ...props, activeId: 's2' });
    expect(screen.getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Work/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('selects a space when its tab is clicked', async () => {
    const onselect = vi.fn();
    render(SpaceTabs, { ...props, onselect });
    await fireEvent.click(screen.getByRole('tab', { name: 'Home' }));
    expect(onselect).toHaveBeenCalledWith('s2');
  });

  it('keeps the Unsorted tab last, outside the tabs that can be moved, and only tabs in the tab list', () => {
    const unsorted = { ...space('w', 'Unsorted'), unsorted: [] };
    render(SpaceTabs, { ...props, spaces: [...spaces, unsorted], unsortedId: 'w' });
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['💼 Work', 'Home', 'Unsorted']);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(tabs[0]!.parentElement).toBe(tabs[1]!.parentElement);
    expect(tabs[2]!.parentElement).not.toBe(tabs[0]!.parentElement);
    expect(screen.getByRole('tablist').querySelectorAll('button:not([role="tab"])')).toHaveLength(0);
  });

  it('has a menu only on the selected tab, and none on Unsorted', async () => {
    const unsorted = { ...space('w', 'Unsorted'), unsorted: [] };
    const { rerender } = render(SpaceTabs, { ...props, spaces: [...spaces, unsorted], unsortedId: 'w' });
    expect(screen.getAllByRole('button', { name: /^Actions for space/ }).map((button) => button.getAttribute('aria-label'))).toEqual([
      'Actions for space Work',
    ]);
    await rerender({ activeId: 'w' });
    expect(screen.queryByRole('button', { name: /^Actions for space/ })).toBeNull();
  });

  it('renames or deletes the selected space from its menu, passing its tab', async () => {
    const onrename = vi.fn();
    const ondelete = vi.fn();
    render(SpaceTabs, { ...props, onrename, ondelete });
    const menu = screen.getByRole('button', { name: 'Actions for space Work' });
    await fireEvent.click(menu);
    await fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    expect(onrename).toHaveBeenCalledExactlyOnceWith(screen.getByRole('tab', { name: /Work/ }));
    await fireEvent.click(menu);
    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(ondelete).toHaveBeenCalledExactlyOnceWith(screen.getByRole('tab', { name: /Work/ }));
  });
});
