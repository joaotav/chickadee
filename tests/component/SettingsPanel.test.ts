import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPanel from '@/components/SettingsPanel.svelte';
import { pickFile } from '@/lib/files';
import { DEFAULTS } from '@/lib/settings';

// The file picker is the browser's own window, so the tests say what was picked.
vi.mock('@/lib/files', () => ({ pickFile: vi.fn() }));

const props = { settings: DEFAULTS, onchange: () => {}, onexport: () => {}, onimport: () => undefined };

const open = async () => {
  await fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  return screen.getByRole('dialog', { name: 'Settings' });
};

describe('SettingsPanel', () => {
  it('starts closed', () => {
    render(SettingsPanel, props);
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens a group of choices for each setting, with the current ones selected', async () => {
    render(SettingsPanel, { ...props, settings: { ...DEFAULTS, theme: 'dracula' } });
    await open();
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('group').map((group) => group.querySelector('legend')?.textContent)).toEqual([
      'Layout',
      'Theme',
      'Density',
      'Titles',
      'Card sizing',
      'Links saved more than once',
    ]);
    expect(screen.getByRole('radio', { name: 'Grid' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Dracula' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Neutral dark' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Comfortable' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'One line' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Fit content' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Mark them' })).toBeChecked();
  });

  it('reports the whole settings object when a choice changes', async () => {
    const onchange = vi.fn();
    render(SettingsPanel, { ...props, onchange });
    await open();
    await fireEvent.click(screen.getByRole('radio', { name: 'Compact' }));
    expect(onchange).toHaveBeenCalledWith({ ...DEFAULTS, density: 'compact' });
  });

  it('stays open while choosing, and closes on a click outside', async () => {
    render(SettingsPanel, props);
    await open();
    await fireEvent.click(screen.getByRole('radio', { name: 'Fixed width' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await fireEvent.click(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape and gives focus back to the settings button', async () => {
    render(SettingsPanel, props);
    await open();
    screen.getByRole('radio', { name: 'Tokyo Night' }).focus();
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  });

  it('closes when the settings button is clicked again', async () => {
    render(SettingsPanel, props);
    await open();
    await fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  describe('Bookmarks', () => {
    beforeEach(() => vi.mocked(pickFile).mockReset());

    it('exports from the Export button', async () => {
      const onexport = vi.fn();
      render(SettingsPanel, { ...props, onexport });
      await open();
      expect(screen.getByRole('region', { name: 'Bookmarks' })).toHaveTextContent('as a bookmarks file');
      await fireEvent.click(screen.getByRole('button', { name: 'Export' }));
      expect(onexport).toHaveBeenCalledOnce();
    });

    it('imports the picked file and closes, or stays as it was when the picker is cancelled', async () => {
      const onimport = vi.fn(() => undefined);
      render(SettingsPanel, { ...props, onimport });
      await open();
      vi.mocked(pickFile).mockResolvedValue(null);
      await fireEvent.click(screen.getByRole('button', { name: 'Import…' }));
      expect(onimport).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      vi.mocked(pickFile).mockResolvedValue('<dl></dl>');
      await fireEvent.click(screen.getByRole('button', { name: 'Import…' }));
      await vi.waitFor(() => expect(onimport).toHaveBeenCalledWith('<dl></dl>'));
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('asks first when spaces in the file are already here', async () => {
      const run = vi.fn();
      render(SettingsPanel, { ...props, onimport: () => ({ taken: ['Work', 'Home', 'Media'], run }) });
      vi.mocked(pickFile).mockResolvedValue('<dl></dl>');
      const ask = async () => {
        await open();
        await fireEvent.click(screen.getByRole('button', { name: 'Import…' }));
        return vi.waitFor(() => screen.getByRole('group', { name: 'Import' }));
      };

      const question = await ask();
      expect(question).toHaveTextContent('Merge the file\'s spaces into yours?');
      expect(question).toHaveTextContent('“Work”, “Home” and 1 more are already here. Keep separate adds them with a number, like “Work (2)”.');
      expect(screen.getByRole('button', { name: 'Merge' })).toHaveFocus();
      await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByRole('button', { name: 'Import…' })).toBeInTheDocument();
      expect(run).not.toHaveBeenCalled();

      await fireEvent.click(screen.getByRole('button', { name: 'Import…' }));
      await vi.waitFor(() => screen.getByRole('button', { name: 'Keep separate' }));
      await fireEvent.click(screen.getByRole('button', { name: 'Keep separate' }));
      expect(run).toHaveBeenLastCalledWith('separate');
      expect(screen.queryByRole('dialog')).toBeNull();

      await ask();
      await fireEvent.click(screen.getByRole('button', { name: 'Merge' }));
      expect(run).toHaveBeenLastCalledWith('merge');
    });
  });
});
