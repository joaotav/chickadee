import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Menu from '@/components/Menu.svelte';

const setup = () => {
  const rename = vi.fn();
  render(Menu, { label: 'Actions for Repos', items: [{ label: 'Rename', onselect: rename }] });
  return { rename, toggle: screen.getByRole('button', { name: 'Actions for Repos' }) };
};

describe('Menu', () => {
  it('shows its items only when opened', async () => {
    const { toggle } = setup();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull();
    await fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });

  it('runs the chosen item and closes', async () => {
    const { rename, toggle } = setup();
    await fireEvent.click(toggle);
    await fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    expect(rename).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull();
  });

  it('closes on a click outside, and on Escape with focus back on its button', async () => {
    const { toggle } = setup();
    await fireEvent.click(toggle);
    await fireEvent.click(document.body);
    expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull();

    await fireEvent.click(toggle);
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull();
    expect(toggle).toHaveFocus();
  });

  it('marks dangerous items, like Delete', async () => {
    render(Menu, { label: 'Actions', items: [{ label: 'Delete', onselect: () => {}, danger: true }] });
    await fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('danger');
  });
});

describe('Menu with places', () => {
  const setupPlaces = async () => {
    const onpick = vi.fn();
    const groups = [
      { label: '💼 Work', places: [{ id: 'c1', label: 'Docs' }, { id: 'c2', label: 'Repos' }] },
      { label: '🏠 Home', places: [{ id: 'c3', label: 'Mídia' }, { id: 'c4', label: 'Taxes' }] },
    ];
    render(Menu, { label: 'Actions for GitHub', items: [{ label: 'Rename', onselect: () => {} }, { label: 'Move to…', places: { groups, onpick } }] });
    await fireEvent.click(screen.getByRole('button', { name: 'Actions for GitHub' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Move to…' }));
    return { onpick, search: screen.getByRole('textbox', { name: 'Search places' }) };
  };
  const shown = () => [...document.querySelectorAll('.places > *')].map((element) => element.textContent?.trim());
  const highlighted = () => document.querySelector('.places .active')?.textContent?.trim();

  it('switches to the places, grouped, with the search field focused, and goes back', async () => {
    const { search } = await setupPlaces();
    expect(search).toHaveFocus();
    expect(shown()).toEqual(['💼 Work', 'Docs', 'Repos', '🏠 Home', 'Mídia', 'Taxes']);
    expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: '‹ Move to' }));
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });

  it('narrows the places to those with every typed word, in their name or their space\'s, ignoring accents and case', async () => {
    const { search } = await setupPlaces();
    await fireEvent.input(search, { target: { value: 'MIDIA' } });
    expect(shown()).toEqual(['🏠 Home', 'Mídia']);
    await fireEvent.input(search, { target: { value: 'home tax' } });
    expect(shown()).toEqual(['🏠 Home', 'Taxes']);
    await fireEvent.input(search, { target: { value: 'work' } });
    expect(shown()).toEqual(['💼 Work', 'Docs', 'Repos']);
    await fireEvent.input(search, { target: { value: 'zzz' } });
    expect(shown()).toEqual(['No matches']);
  });

  it('moves a highlight with the arrow keys, wrapping around, and Enter picks it', async () => {
    const { onpick, search } = await setupPlaces();
    expect(highlighted()).toBe('Docs');
    await fireEvent.keyDown(search, { key: 'ArrowUp' });
    expect(highlighted()).toBe('Taxes');
    await fireEvent.keyDown(search, { key: 'ArrowDown' });
    await fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(highlighted()).toBe('Repos');
    expect(search).toHaveFocus();
    await fireEvent.keyDown(search, { key: 'Enter' });
    expect(onpick).toHaveBeenCalledWith('c2');
    expect(screen.queryByRole('textbox', { name: 'Search places' })).toBeNull();
  });

  it('starts the highlight on the first match after typing, and picks a clicked place', async () => {
    const { onpick, search } = await setupPlaces();
    await fireEvent.keyDown(search, { key: 'ArrowDown' });
    await fireEvent.input(search, { target: { value: 'home' } });
    expect(highlighted()).toBe('Mídia');
    await fireEvent.click(screen.getByRole('button', { name: 'Taxes' }));
    expect(onpick).toHaveBeenCalledWith('c4');
    expect(screen.queryByRole('button', { name: 'Taxes' })).toBeNull();
  });
});
