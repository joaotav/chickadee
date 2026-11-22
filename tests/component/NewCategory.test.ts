import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import NewCategory from '@/components/NewCategory.svelte';

const setup = async (taken: string[] = []) => {
  const oncreate = vi.fn();
  render(NewCategory, { oncreate, taken });
  await fireEvent.click(screen.getByRole('button', { name: '+ New category' }));
  return { oncreate, name: screen.getByRole('textbox', { name: 'Category name' }) };
};

describe('NewCategory', () => {
  it('opens a form with the name field focused, and Add and Cancel buttons', async () => {
    const { name } = await setup();
    expect(name).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('creates the category with Add or Enter, trimmed, and closes', async () => {
    const { oncreate, name } = await setup();
    await fireEvent.input(name, { target: { value: '  Reading ' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(oncreate).toHaveBeenLastCalledWith('Reading');
    expect(screen.queryByRole('textbox')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: '+ New category' }));
    const again = screen.getByRole('textbox', { name: 'Category name' });
    await fireEvent.input(again, { target: { value: 'Docs' } });
    await fireEvent.submit(again);
    expect(oncreate).toHaveBeenLastCalledWith('Docs');
  });

  it('refuses the name of a category already in the space, whatever its letter case', async () => {
    const { oncreate, name } = await setup(['Unsorted', 'Reading']);
    await fireEvent.input(name, { target: { value: 'reading ' } });
    expect(screen.getByRole('alert')).toHaveTextContent('There\'s already a category called “Reading”');
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    await fireEvent.submit(name);
    expect(oncreate).not.toHaveBeenCalled();
    expect(name).toBeInTheDocument();
    await fireEvent.input(name, { target: { value: 'Reading list' } });
    expect(screen.queryByRole('alert')).toBeNull();
    await fireEvent.submit(name);
    expect(oncreate).toHaveBeenCalledWith('Reading list');
  });

  it('closes without creating on Cancel or Escape', async () => {
    const { oncreate, name } = await setup();
    await fireEvent.input(name, { target: { value: 'Reading' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: '+ New category' }));
    await fireEvent.keyDown(screen.getByRole('textbox', { name: 'Category name' }), { key: 'Escape' });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(oncreate).not.toHaveBeenCalled();
  });

  it('closes on a click elsewhere only while nothing is typed', async () => {
    await setup();
    await fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('textbox')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: '+ New category' }));
    await fireEvent.input(screen.getByRole('textbox', { name: 'Category name' }), { target: { value: 'Reading' } });
    await fireEvent.pointerDown(document.body);
    expect(screen.getByRole('textbox', { name: 'Category name' })).toHaveValue('Reading');
  });
});
