import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SessionForm from '@/components/SessionForm.svelte';
import type { Space } from '@/lib/tree';

const spaces: Space[] = [
  { id: 's1', name: 'Work', emoji: '💼', unsorted: [], categories: [] },
  { id: 's2', name: 'Home', emoji: null, unsorted: [], categories: [] },
];
const props = { spaces, count: null, onsave: () => {}, oncancel: () => {} };

describe('SessionForm', () => {
  it('fills in a name with the date and time, selected for retyping', () => {
    render(SessionForm, props);
    const name = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    expect(name.value).toMatch(/^Session /);
    expect([name.selectionStart, name.selectionEnd]).toEqual([0, name.value.length]);
  });

  it('cuts long space names in the list and the taken-name message, keeping the full name in the tooltip', async () => {
    const long = 'Recipes and cooking ideas for the weekend, with a long name';
    const category = { id: 'c3', title: 'Taken', links: [] };
    render(SessionForm, { ...props, spaces: [...spaces, { id: 's3', name: long, emoji: '🏠', unsorted: [], categories: [category] }], spaceId: 's3' });
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['💼 Work', 'Home', '🏠 Recipes and cooking ideas for the wee…']);
    expect(options.map((option) => option.getAttribute('title'))).toEqual([null, null, `🏠 ${long}`]);
    await fireEvent.input(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Taken' } });
    expect(screen.getByRole('alert')).toHaveTextContent('There\'s already a category called “Taken” in 🏠 Recipes and cooking ideas for the wee…');
  });

  it('starts on the given space, or the first one when it is gone', () => {
    const { unmount } = render(SessionForm, { ...props, spaceId: 's2' });
    expect(screen.getByRole('combobox', { name: 'Space' })).toHaveValue('s2');
    unmount();
    render(SessionForm, { ...props, spaceId: 'deleted' });
    expect(screen.getByRole('combobox', { name: 'Space' })).toHaveValue('s1');
  });

  it('refuses the name of a category already in the picked space', async () => {
    const onsave = vi.fn();
    const withCategories: Space[] = [
      { ...spaces[0]!, categories: [{ id: 'c1', title: 'Reading', links: [] }] },
      { ...spaces[1]!, unsorted: [{ id: 'l1', title: 'Loose', url: 'https://example.com/', openable: true }] },
    ];
    render(SessionForm, { ...props, spaces: withCategories, onsave });
    const name = screen.getByRole('textbox', { name: 'Name' });
    await fireEvent.input(name, { target: { value: 'reading' } });
    expect(screen.getByRole('alert')).toHaveTextContent('There\'s already a category called “Reading” in 💼 Work');
    expect(screen.getByRole('button', { name: 'Save tabs' })).toBeDisabled();
    await fireEvent.submit(name);
    expect(onsave).not.toHaveBeenCalled();

    // Another space can have one called that, and Unsorted counts while the space has loose links.
    await fireEvent.change(screen.getByRole('combobox', { name: 'Space' }), { target: { value: 's2' } });
    expect(screen.queryByRole('alert')).toBeNull();
    await fireEvent.input(name, { target: { value: 'Unsorted' } });
    expect(screen.getByRole('alert')).toHaveTextContent('There\'s already a category called “Unsorted” in Home');
    await fireEvent.input(name, { target: { value: 'Reading' } });
    await fireEvent.submit(name);
    expect(onsave).toHaveBeenCalledWith('s2', 'Reading');
  });

  it('says how many tabs it saves once that is known', () => {
    const { unmount } = render(SessionForm, props);
    expect(screen.getByRole('button', { name: 'Save tabs' })).toBeInTheDocument();
    unmount();
    render(SessionForm, { ...props, count: 3 });
    expect(screen.getByText(/Saves the 3 web pages open in this window/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save 3 tabs' })).toBeInTheDocument();
  });

  it('saves to the chosen space with the typed name, or the default name when it is cleared', async () => {
    const onsave = vi.fn();
    render(SessionForm, { ...props, onsave });
    await fireEvent.change(screen.getByRole('combobox', { name: 'Space' }), { target: { value: 's2' } });
    await fireEvent.input(screen.getByRole('textbox', { name: 'Name' }), { target: { value: '  Taxes 2026 ' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save tabs' }));
    expect(onsave).toHaveBeenLastCalledWith('s2', 'Taxes 2026');
    await fireEvent.input(screen.getByRole('textbox', { name: 'Name' }), { target: { value: ' ' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save tabs' }));
    expect(onsave).toHaveBeenLastCalledWith('s2', expect.stringMatching(/^Session /));
  });
});
