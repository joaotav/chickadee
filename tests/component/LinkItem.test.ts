import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LinkItem from '@/components/LinkItem.svelte';
import type { Link } from '@/lib/tree';

const web: Link = { id: 'l1', title: 'GitHub', url: 'https://github.com/', openable: true };

/** Opens the Edit bookmark form of the link with this title. */
async function edit(title: string) {
  await fireEvent.click(screen.getByRole('button', { name: `Actions for ${title}` }));
  await fireEvent.click(screen.getByRole('button', { name: 'Edit bookmark' }));
  return { url: screen.getByRole('textbox', { name: 'URL' }), title: screen.getByRole('textbox', { name: 'Title' }) };
}

describe('LinkItem', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('renders a web link that opens its URL', () => {
    render(LinkItem, { link: web });
    const anchor = screen.getByRole('link', { name: 'GitHub' });
    expect(anchor).toHaveAttribute('href', 'https://github.com/');
    expect(anchor).toHaveAttribute('title', 'GitHub\nhttps://github.com/');
  });

  it('has the URL without its scheme ready for the "Title and URL" setting, hidden from screen readers', () => {
    render(LinkItem, { link: web });
    expect(screen.getByText('github.com/')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('link')).toHaveAccessibleName('GitHub');
  });

  it('shows other links as plain text that cannot be clicked', () => {
    render(LinkItem, { link: { id: 'l2', title: 'Bookmarklet', url: 'javascript:alert(1)', openable: false } });
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Bookmarklet').closest('[title]')).toHaveAttribute(
      'title',
      expect.stringContaining('Only web links can be opened'),
    );
    expect(document.querySelector('[href]')).toBeNull();
  });

  it('shows HTML in a title as text instead of rendering it', () => {
    render(LinkItem, { link: { ...web, title: '<img src=x onerror=alert(1)><b>bold</b>' } });
    expect(screen.getByRole('link')).toHaveTextContent('<img src=x onerror=alert(1)><b>bold</b>');
    expect(document.querySelector('b')).toBeNull();
  });

  it('shows the favicon on Chrome, and a letter tile if it fails to load', async () => {
    render(LinkItem, { link: web });
    const icon = document.querySelector('img')!;
    expect(icon.src).toContain('/_favicon/?pageUrl=https%3A%2F%2Fgithub.com%2F');
    await fireEvent.error(icon);
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('G')).toBeInTheDocument();
  });

  it('shows a letter tile on Firefox', () => {
    vi.stubEnv('BROWSER', 'firefox');
    render(LinkItem, { link: web });
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('G')).toBeInTheDocument();
  });

  it('marks a link saved more than once, but not while it is being edited', async () => {
    render(LinkItem, { link: web, onupdate: () => {}, alsoIn: ['💼 Work › Docs'] });
    expect(screen.getByRole('button', { name: 'Saved 2 times' })).toBeInTheDocument();
    await edit('GitHub');
    expect(screen.queryByRole('button', { name: 'Saved 2 times' })).toBeNull();
  });

  it('has no mark when it is saved once', () => {
    render(LinkItem, { link: web });
    expect(screen.queryByRole('button', { name: /^Saved/ })).toBeNull();
  });

  it('can only be edited when it gets an onupdate handler', () => {
    render(LinkItem, { link: web });
    expect(screen.queryByRole('button', { name: 'Actions for GitHub' })).toBeNull();
  });

  it('has Edit bookmark in its menu instead of Rename and Edit URL', async () => {
    render(LinkItem, { link: web, onupdate: () => {}, ondelete: () => {} });
    await fireEvent.click(screen.getByRole('button', { name: 'Actions for GitHub' }));
    const items = screen.getByRole('button', { name: 'Edit bookmark' }).parentElement!;
    expect([...items.children].map((item) => item.textContent)).toEqual(['Edit bookmark', 'Delete']);
  });

  it('edits the title and URL in one form, normalizing the URL and refusing other schemes', async () => {
    const onupdate = vi.fn();
    render(LinkItem, { link: web, onupdate });
    const { url, title } = await edit('GitHub');
    expect(url).toHaveValue('https://github.com/');
    expect(url).toHaveFocus();
    expect(title).toHaveValue('GitHub');
    await fireEvent.input(url, { target: { value: 'javascript:alert(1)' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a web address');
    expect(onupdate).not.toHaveBeenCalled();
    await fireEvent.input(url, { target: { value: 'github.com/sveltejs' } });
    await fireEvent.input(title, { target: { value: ' Svelte ' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onupdate).toHaveBeenCalledWith({ url: 'https://github.com/sveltejs', title: 'Svelte' });
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeInTheDocument();
  });

  it('sends only what changed, and nothing when nothing did', async () => {
    const onupdate = vi.fn();
    render(LinkItem, { link: web, onupdate });
    const { title } = await edit('GitHub');
    await fireEvent.input(title, { target: { value: 'Code' } });
    await fireEvent.submit(title.closest('form')!);
    expect(onupdate).toHaveBeenLastCalledWith({ title: 'Code' });
    const { url } = await edit('GitHub');
    await fireEvent.submit(url.closest('form')!);
    expect(onupdate).toHaveBeenCalledOnce();
  });

  it('goes back to its default title when the title is cleared', async () => {
    const onupdate = vi.fn();
    render(LinkItem, { link: { ...web, url: 'https://www.github.com/' }, onupdate });
    const { title } = await edit('GitHub');
    await fireEvent.input(title, { target: { value: ' ' } });
    await fireEvent.submit(title.closest('form')!);
    expect(onupdate).toHaveBeenCalledWith({ title: 'github.com' });
  });

  it('keeps an address it cannot open, like a bookmarklet, when only the title changes', async () => {
    const onupdate = vi.fn();
    render(LinkItem, { link: { id: 'l2', title: 'Bookmarklet', url: 'javascript:alert(1)', openable: false }, onupdate });
    const { title } = await edit('Bookmarklet');
    await fireEvent.input(title, { target: { value: 'Alert' } });
    await fireEvent.submit(title.closest('form')!);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onupdate).toHaveBeenCalledWith({ title: 'Alert' });
  });

  it('closes without saving on Escape or Cancel', async () => {
    const onupdate = vi.fn();
    render(LinkItem, { link: web, onupdate });
    const { url } = await edit('GitHub');
    await fireEvent.input(url, { target: { value: 'example.com' } });
    await fireEvent.keyDown(url, { key: 'Escape' });
    expect(screen.queryByRole('textbox', { name: 'URL' })).toBeNull();
    await edit('GitHub');
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox', { name: 'URL' })).toBeNull();
    expect(onupdate).not.toHaveBeenCalled();
  });

  it('closes on a press outside, unless something has been changed', async () => {
    render(LinkItem, { link: web, onupdate: () => {} });
    const { title } = await edit('GitHub');
    await fireEvent.input(title, { target: { value: 'Code' } });
    await fireEvent.pointerDown(document.body);
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Code');
    await fireEvent.input(title, { target: { value: 'GitHub' } });
    await fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull();
  });
});
