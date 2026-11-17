<script lang="ts">
  import { proto } from '@/lib/prototype.svelte';
  import { defaultTitle, toWebUrl, type Link } from '@/lib/tree';
  import Grip from './Grip.svelte';
  import InlineInput from './InlineInput.svelte';
  import LinkIcon from './LinkIcon.svelte';
  import Menu from './Menu.svelte';

  let {
    link,
    onupdate,
    ondelete,
  }: {
    link: Link;
    /** Renames the link or changes its URL. Without it, the link can't be edited. */
    onupdate?: (changes: { title?: string; url?: string }) => void;
    ondelete?: () => void;
  } = $props();

  let editing = $state<'title' | 'url' | null>(null);

  function saveUrl(text: string) {
    const url = toWebUrl(text);
    if (!url) return 'Enter a web address, like example.com';
    onupdate?.({ url });
    editing = null;
  }

  // PROTOTYPE (#72), variant E: pressing anywhere on the link drags it, as on a category header.
  let row: HTMLElement;
  function dragFromRow(event: MouseEvent) {
    const grip = row.querySelector('.grip');
    const onLink = (event.target as Element).closest('.link');
    if (proto.variant !== 'e' || !grip || !onLink || event.button !== 0) return;
    event.preventDefault();
    grip.dispatchEvent(new MouseEvent('mousedown', event));
  }
</script>

{#snippet content()}
  <LinkIcon {link} />
  <span class="text">
    <span class="title">{link.title}</span>
    <!-- Shown only with the "Title and URL" setting. The tooltip already gives the URL to screen readers. -->
    <span class="url" aria-hidden="true">{link.url.replace(/^https?:\/\//, '')}</span>
  </span>
{/snippet}

<div class="row" bind:this={row} onmousedown={dragFromRow} role="presentation">
  {#if editing === 'title'}
    <!-- An empty title goes back to the default, the same as adding a link without one. -->
    <InlineInput
      value={link.title}
      label="Title"
      placeholder={defaultTitle(link.url)}
      allowEmpty
      onsave={(title) => {
        onupdate?.({ title: title || defaultTitle(link.url) });
        editing = null;
      }}
      oncancel={() => (editing = null)}
    />
  {:else if editing === 'url'}
    <InlineInput value={link.url} label="URL" onsave={saveUrl} oncancel={() => (editing = null)} />
  {:else if link.openable}
    <a class="link" href={link.url} title={`${link.title}\n${link.url}`}>{@render content()}</a>
  {:else}
    <span class="link disabled" title={`${link.title}\n${link.url}\nOnly web links can be opened from this page.`}>
      {@render content()}
    </span>
  {/if}
  {#if !editing}
    <!-- Over the icon, so the rest of the link can still be dragged out to the toolbar or another window. -->
    <Grip label="Move {link.title}" />
  {/if}
  {#if onupdate && !editing}
    <Menu
      label="Actions for {link.title}"
      items={[
        { label: 'Rename', onselect: () => (editing = 'title') },
        { label: 'Edit URL', onselect: () => (editing = 'url') },
        ...(ondelete ? [{ label: 'Delete', onselect: ondelete, danger: true }] : []),
      ]}
    />
  {/if}
</div>

<style>
  .row {
    position: relative;
    display: flex;
    align-items: center;
  }
  /* The menu button sits over the end of the row and shows on hover or keyboard focus. */
  .row > :global(.menu) {
    position: absolute;
    right: 6px;
  }
  .row:not(:hover, :focus-within) > :global(:is(.menu:not(.open), .grip)) {
    opacity: 0;
  }
  /* Covers the icon and the space before the title, the whole height of the row. */
  .row > :global(.grip) {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 32px;
    height: auto;
    border-radius: 6px 0 0 6px;
    background: var(--row-hover);
  }
  .row > :global(.menu:not(.open) .toggle:not(:hover)) {
    background: var(--row-hover);
  }
  .link {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    height: var(--row-height);
    padding: 0 8px;
    border-radius: 6px;
    background: var(--row);
    color: var(--fg);
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.15s;
  }
  a.link:hover {
    background: var(--row-hover);
  }
  .disabled {
    color: var(--muted);
    cursor: default;
  }
  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .title,
  .url {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .url {
    display: none;
    color: var(--muted);
    font-size: 11px;
  }
  /* Titles that take more than one line make the row grow, with the icon at the top. */
  :global(:root:is([data-titles='two-lines'], [data-titles='with-url'])) .link {
    align-items: flex-start;
    height: auto;
    min-height: var(--row-height);
    padding-block: 6px;
  }
  :global(:root:is([data-titles='two-lines'], [data-titles='with-url'])) .link > :global(.icon) {
    margin-top: 1px;
  }
  /* Level with the icon, which sits at the top of rows taller than one line. */
  :global(:root:is([data-titles='two-lines'], [data-titles='with-url'])) .row > :global(.grip) {
    align-items: start;
    padding-top: 7px;
  }
  :global(:root[data-titles='two-lines']) .title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  :global(:root[data-titles='with-url']) .url {
    display: block;
  }

  /* PROTOTYPE (#72): the variants, picked by the switcher at the bottom of the page. */
  /* B and D: the row stays lit while the pointer is anywhere on it, grip included. */
  :global(:root:is([data-proto-grip='b'], [data-proto-grip='d'])) .row:hover > a.link {
    background: var(--row-hover);
  }
  /* C and D: a rounded box over the icon only, leaving a gap before the title. */
  :global(:root:is([data-proto-grip='c'], [data-proto-grip='d'])) .row > :global(.grip) {
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: 24px;
    border-radius: 4px;
  }
  :global(:root:is([data-proto-grip='c'], [data-proto-grip='d'])) .row > :global(.grip:hover) {
    background: color-mix(in srgb, var(--fg) 10%, var(--row-hover));
  }
  /* E: the grip is only for the keyboard, an outline around the row when tabbed to. */
  :global(:root[data-proto-grip='e']) .row > :global(.grip) {
    inset: 0;
    width: auto;
    border-radius: 6px;
    opacity: 0;
    pointer-events: none;
  }
  :global(:root[data-proto-grip='e']) .row > :global(.grip:focus-visible) {
    opacity: 1;
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    background: none;
  }
  :global(:root[data-proto-grip='e']) .row > :global(.grip svg) {
    visibility: hidden;
  }
  /* Level with the icon in taller rows, now that the box starts 4px lower. */
  :global(:root:is([data-titles='two-lines'], [data-titles='with-url']):is([data-proto-grip='c'], [data-proto-grip='d'])) .row > :global(.grip) {
    padding-top: 3px;
  }
</style>
