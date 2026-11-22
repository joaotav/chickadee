import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SpaceForm from '@/components/SpaceForm.svelte';

// The real picker needs IndexedDB, which jsdom lacks. The tests fire its events instead, and
// the end-to-end tests use the real one.
vi.mock('emoji-picker-element', () => ({
  Database: class {
    getEmojiByGroup = async () => [{ unicode: '🦊' }];
  },
}));

const nameField = () => screen.getByRole('textbox', { name: 'Space name' });
const iconButton = () => screen.getByRole('button', { name: /^Icon/ });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

/** Picks an emoji in the open picker, as a click on one of its buttons would. */
async function pickEmoji(unicode: string, skins?: string[]) {
  const picker = document.querySelector('emoji-picker')!;
  const button = document.createElement('button');
  button.setAttribute('role', 'menuitem');
  picker.append(button);
  await fireEvent.click(button);
  const emoji = { unicode, annotation: 'some emoji', ...(skins && { skins: skins.map((unicode) => ({ unicode })) }) };
  await fireEvent(picker, new CustomEvent('emoji-click', { detail: { unicode, emoji } }));
}

describe('SpaceForm', () => {
  it('starts with no icon, shown as a plain smiley, and focus on the name', () => {
    render(SpaceForm, { heading: 'New space', onsave: () => {}, oncancel: () => {} });
    expect(screen.getByRole('form', { name: 'New space' })).toBeInTheDocument();
    expect(nameField()).toHaveFocus();
    expect(iconButton()).toHaveAccessibleName('Icon');
    expect(iconButton().querySelector('svg')).not.toBeNull();
    expect(document.querySelector('emoji-picker')).toBeNull();
  });

  it('opens the picker from the icon button, and saves the picked emoji with the trimmed name', async () => {
    const onsave = vi.fn();
    render(SpaceForm, { heading: 'New space', onsave, oncancel: () => {} });
    await fireEvent.input(nameField(), { target: { value: ' Launch ' } });
    await fireEvent.click(iconButton());
    expect(iconButton()).toHaveAttribute('aria-expanded', 'true');
    await pickEmoji('🚀');
    expect(document.querySelector('emoji-picker')).toBeNull();
    expect(iconButton()).toHaveAccessibleName('Icon 🚀');
    await save();
    expect(onsave).toHaveBeenCalledWith('🚀', 'Launch');
  });

  it('offers the skin tones of an emoji that has them', async () => {
    render(SpaceForm, { heading: 'New space', onsave: () => {}, oncancel: () => {} });
    await fireEvent.click(iconButton());
    await pickEmoji('👋', ['👋🏻', '👋🏼', '👋🏽', '👋🏾', '👋🏿']);
    const tones = screen.getByRole('group', { name: 'Skin tone for some emoji' });
    expect([...tones.querySelectorAll('button')].map((button) => button.textContent)).toEqual(['👋', '👋🏻', '👋🏼', '👋🏽', '👋🏾', '👋🏿']);
    expect(iconButton()).toHaveAccessibleName('Icon');
    await fireEvent.click(screen.getByRole('button', { name: '👋🏽' }));
    expect(iconButton()).toHaveAccessibleName('Icon 👋🏽');
  });

  it('picks a random emoji, or no icon', async () => {
    render(SpaceForm, { heading: 'Rename space', emoji: '💼', name: 'Work', onsave: () => {}, oncancel: () => {} });
    await fireEvent.click(iconButton());
    await fireEvent.click(screen.getByRole('button', { name: 'Random' }));
    await vi.waitFor(() => expect(iconButton()).toHaveAccessibleName('Icon 🦊'));
    await fireEvent.click(iconButton());
    await fireEvent.click(screen.getByRole('button', { name: 'No icon' }));
    expect(iconButton()).toHaveAccessibleName('Icon');
  });

  it('can only save once there is a name', async () => {
    render(SpaceForm, { heading: 'New space', onsave: () => {}, oncancel: () => {} });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await fireEvent.input(nameField(), { target: { value: '🚀' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('refuses the name of another space, whatever its icon or letter case', async () => {
    const onsave = vi.fn();
    render(SpaceForm, { heading: 'New space', taken: ['Home', 'Work'], onsave, oncancel: () => {} });
    await fireEvent.input(nameField(), { target: { value: ' work' } });
    expect(screen.getByRole('alert')).toHaveTextContent('There\'s already a space called “Work”');
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await fireEvent.submit(nameField());
    await fireEvent.input(nameField(), { target: { value: '🏠 home' } });
    expect(screen.getByRole('alert')).toHaveTextContent('There\'s already a space called “Home”');
    await fireEvent.submit(nameField());
    expect(onsave).not.toHaveBeenCalled();
    await fireEvent.input(nameField(), { target: { value: 'Homework' } });
    expect(screen.queryByRole('alert')).toBeNull();
    await save();
    expect(onsave).toHaveBeenCalledWith(null, 'Homework');
  });

  it('starts from the current icon and name when renaming', async () => {
    const onsave = vi.fn();
    render(SpaceForm, { heading: 'Rename space', emoji: '💼', name: 'Work', onsave, oncancel: () => {} });
    expect(nameField()).toHaveValue('Work');
    expect(iconButton()).toHaveAccessibleName('Icon 💼');
    await save();
    expect(onsave).toHaveBeenCalledWith('💼', 'Work');
  });

  it('takes an emoji typed at the start of the name', async () => {
    const onsave = vi.fn();
    render(SpaceForm, { heading: 'New space', onsave, oncancel: () => {} });
    await fireEvent.input(nameField(), { target: { value: '🛠️ Tools' } });
    await save();
    expect(onsave).toHaveBeenLastCalledWith('🛠️', 'Tools');
  });

  it('closes the picker on Escape, then the form', async () => {
    const oncancel = vi.fn();
    render(SpaceForm, { heading: 'New space', onsave: () => {}, oncancel });
    await fireEvent.click(iconButton());
    await fireEvent.keyDown(iconButton(), { key: 'Escape' });
    expect(document.querySelector('emoji-picker')).toBeNull();
    expect(oncancel).not.toHaveBeenCalled();
    await fireEvent.keyDown(nameField(), { key: 'Escape' });
    expect(oncancel).toHaveBeenCalledOnce();
  });

  it('cancels with the Cancel button', async () => {
    const oncancel = vi.fn();
    render(SpaceForm, { heading: 'New space', onsave: () => {}, oncancel });
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(oncancel).toHaveBeenCalledOnce();
  });

  it('closes on a press outside, unless a name has been typed', async () => {
    const oncancel = vi.fn();
    render(SpaceForm, { heading: 'New space', onsave: () => {}, oncancel });
    await fireEvent.pointerDown(nameField());
    expect(oncancel).not.toHaveBeenCalled();
    await fireEvent.pointerDown(document.body);
    expect(oncancel).toHaveBeenCalledOnce();
    await fireEvent.input(nameField(), { target: { value: 'Launch' } });
    await fireEvent.pointerDown(document.body);
    expect(oncancel).toHaveBeenCalledOnce();
  });

  it('closes on a press outside when renaming, unless the icon or name has changed', async () => {
    const oncancel = vi.fn();
    render(SpaceForm, { heading: 'Rename space', emoji: '💼', name: 'Work', onsave: () => {}, oncancel });
    await fireEvent.pointerDown(document.body);
    expect(oncancel).toHaveBeenCalledOnce();
    await fireEvent.click(iconButton());
    await pickEmoji('🏠');
    await fireEvent.pointerDown(document.body);
    expect(oncancel).toHaveBeenCalledOnce();
  });
});
