import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SaveForm from '@/components/SaveForm.svelte';
import type { Space } from '@/lib/tree';

const link = (id: string, url: string) => ({ id, title: id, url, openable: true });
const spaces: Space[] = [
  {
    id: 's1',
    name: 'Work',
    emoji: '💼',
    unsorted: [],
    categories: [
      { id: 'c1', title: 'Repos', links: [link('l1', 'https://github.com/')] },
      { id: 'c2', title: 'Docs', links: [] },
    ],
  },
  { id: 's2', name: 'Empty', emoji: null, unsorted: [], categories: [] },
  { id: 's3', name: 'Home', emoji: null, unsorted: [], categories: [{ id: 'c3', title: 'Media', links: [] }] },
];
const props = { url: 'https://gitlab.com/', title: 'GitLab', spaces, categoryId: undefined, onsave: () => {}, oncancel: () => {} };

describe('SaveForm', () => {
  it('fills in the page and selects its title for retyping', () => {
    render(SaveForm, props);
    const title = screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement;
    expect(title).toHaveValue('GitLab');
    expect([title.selectionStart, title.selectionEnd]).toEqual([0, 6]);
    expect(screen.getByRole('textbox', { name: 'URL' })).toHaveValue('https://gitlab.com/');
  });

  it('groups the categories by space, leaving out spaces without any', () => {
    render(SaveForm, props);
    const groups = [...document.querySelectorAll('optgroup')].map((group) => [
      group.label,
      [...group.querySelectorAll('option')].map((option) => option.textContent),
    ]);
    expect(groups).toEqual([
      ['💼 Work', ['Repos', 'Docs']],
      ['Home', ['Media']],
    ]);
  });

  it('cuts long space and category names in the list, keeping the full name in its tooltip', () => {
    const long = 'Recipes and cooking ideas for the weekend, with a long name';
    render(SaveForm, {
      ...props,
      spaces: [{ id: 's9', name: long, emoji: '🏠', unsorted: [], categories: [{ id: 'c9', title: long, links: [] }] }],
    });
    expect(document.querySelector('optgroup')!.label).toBe('🏠 Recipes and cooking ideas for the wee…');
    const option = screen.getByRole('option');
    expect(option).toHaveTextContent('Recipes and cooking ideas for the weeke…');
    expect(option).toHaveAttribute('title', long);
  });

  it('selects the last used category, or the first one when it is gone', () => {
    const { unmount } = render(SaveForm, { ...props, categoryId: 'c3' });
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('c3');
    unmount();
    render(SaveForm, { ...props, categoryId: 'deleted' });
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('c1');
  });

  it('says where the page is already saved, and offers to save it anyway, following the URL field', async () => {
    render(SaveForm, props);
    expect(screen.queryByText(/Already in/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    await fireEvent.input(screen.getByRole('textbox', { name: 'URL' }), { target: { value: 'github.com' } });
    expect(screen.getByText('Already in Work › Repos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save anyway' })).toBeInTheDocument();
    await fireEvent.input(screen.getByRole('textbox', { name: 'URL' }), { target: { value: 'gitlab.com' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('saves another copy of an already-saved page', async () => {
    const onsave = vi.fn();
    render(SaveForm, { ...props, url: 'https://github.com/', title: 'GitHub', onsave });
    await fireEvent.click(screen.getByRole('button', { name: 'Save anyway' }));
    expect(onsave).toHaveBeenCalledWith('c1', 'https://github.com/', 'GitHub');
  });

  it('saves to the chosen category, naming an untitled page after its site', async () => {
    const onsave = vi.fn();
    render(SaveForm, { ...props, onsave });
    await fireEvent.input(screen.getByRole('textbox', { name: 'Title' }), { target: { value: '  ' } });
    await fireEvent.input(screen.getByRole('textbox', { name: 'URL' }), { target: { value: 'www.gitlab.com/explore' } });
    await fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'c2' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onsave).toHaveBeenCalledWith('c2', 'https://www.gitlab.com/explore', 'gitlab.com');
  });

  it('refuses an address that is not a web page', async () => {
    const onsave = vi.fn();
    render(SaveForm, { ...props, onsave });
    await fireEvent.input(screen.getByRole('textbox', { name: 'URL' }), { target: { value: 'javascript:alert(1)' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a web address, like example.com');
    expect(onsave).not.toHaveBeenCalled();
  });

  it('cancels', async () => {
    const oncancel = vi.fn();
    render(SaveForm, { ...props, oncancel });
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(oncancel).toHaveBeenCalledOnce();
  });
});
