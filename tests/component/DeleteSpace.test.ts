import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DeleteSpace from '@/components/DeleteSpace.svelte';
import type { Category, Link, Space } from '@/lib/tree';

const link = (id: string): Link => ({ id, title: id, url: `https://example.com/${id}`, openable: true });
const category = (id: string, links: Link[]): Category => ({ id, title: id, links });
const space = (categories: Category[], unsorted: Link[] = []): Space => ({ id: 's1', name: 'Work', emoji: '💼', categories, unsorted });

const setup = (target: Space) => {
  const ondelete = vi.fn();
  const oncancel = vi.fn();
  render(DeleteSpace, { space: target, ondelete, oncancel });
  return { ondelete, oncancel };
};

describe('DeleteSpace', () => {
  it('names the space, its categories and all its bookmarks', () => {
    setup(space([category('Repos', [link('a'), link('b')]), category('Docs', [link('c')])], [link('d')]));
    expect(screen.getByRole('group', { name: 'Delete space “💼 Work” and its 2 categories (4 bookmarks)?' })).toBeInTheDocument();
  });

  it('leaves out a count of zero, and uses the singular for one', () => {
    setup(space([category('Empty', [])]));
    expect(screen.getByText('Delete space “💼 Work” and its 1 category?')).toBeInTheDocument();
  });

  it('asks about the bookmarks alone in a space without categories', () => {
    setup(space([], [link('a')]));
    expect(screen.getByText('Delete space “💼 Work” and its 1 bookmark?')).toBeInTheDocument();
  });

  it('starts on Cancel, and deletes only with Delete', async () => {
    const { ondelete, oncancel } = setup(space([category('Repos', [link('a')])]));
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(oncancel).toHaveBeenCalledOnce();
    expect(ondelete).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(ondelete).toHaveBeenCalledOnce();
  });

  it('cancels on Escape and on a click outside, not on a click inside', async () => {
    const { ondelete, oncancel } = setup(space([category('Repos', [link('a')])]));
    await fireEvent.pointerDown(screen.getByText(/Delete space/));
    expect(oncancel).not.toHaveBeenCalled();
    await fireEvent.keyDown(screen.getByRole('button', { name: 'Cancel' }), { key: 'Escape' });
    expect(oncancel).toHaveBeenCalledOnce();
    await fireEvent.pointerDown(document.body);
    expect(oncancel).toHaveBeenCalledTimes(2);
    expect(ondelete).not.toHaveBeenCalled();
  });
});
