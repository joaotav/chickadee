<script lang="ts">
  import { defaultTitle, toWebUrl, type Link } from '@/lib/tree';
  import Grip from './Grip.svelte';
  import InlineInput from './InlineInput.svelte';
  import LinkIcon from './LinkIcon.svelte';
  import Menu from './Menu.svelte';
  import MovePicker, { type PlaceGroup } from './MovePicker.svelte';
  import { proto } from '@/lib/prototype.svelte';

  let {
    link,
    onupdate,
    ondelete,
    places = [],
    onmoveto,
  }: {
    link: Link;
    /** Renames the link or changes its URL. Without it, the link can't be edited. */
    onupdate?: (changes: { title?: string; url?: string }) => void;
    ondelete?: () => void;
    /** PROTOTYPE (#59): the categories this link can move to, and moving it. */
    places?: PlaceGroup[];
    onmoveto?: (categoryId: string) => void;
  } = $props();

  let editing = $state<'title' | 'url' | null>(null);
  let moving = $state(false);
  const hasPlaces = $derived(!!onmoveto && places.some((group) => group.places.length > 0));

  function saveUrl(text: string) {
    const url = toWebUrl(text);
    if (!url) return 'Enter a web address, like example.com';
    onupdate?.({ url });
    editing = null;
  }

  let row: HTMLElement;

  // Pressing the link drags it, as pressing its grip would. The drag only starts once the
  // pointer moves a few pixels, so a click still opens the link.
  function dragFromLink(event: MouseEvent) {
    const grip = row.querySelector('.grip');
    if (!grip || event.button !== 0) return;
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

<div class="row" bind:this={row}>
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
    <a class="link" href={link.url} title={`${link.title}\n${link.url}`} onmousedown={dragFromLink}>{@render content()}</a>
  {:else}
    <span
      class="link disabled"
      title={`${link.title}\n${link.url}\nOnly web links can be opened from this page.`}
      role="presentation"
      onmousedown={dragFromLink}
    >
      {@render content()}
    </span>
  {/if}
  {#if !editing}
    <Grip label="Move {link.title}" />
  {/if}
  {#if onupdate && !editing}
    <Menu
      label="Actions for {link.title}"
      items={[
        { label: 'Rename', onselect: () => (editing = 'title') },
        { label: 'Edit URL', onselect: () => (editing = 'url') },
        ...(hasPlaces
          ? [
              {
                label: 'Move to…',
                onselect: () => (moving = true),
                ...((proto.variant === 'a' || proto.variant === 'd') && { places: { groups: places, onpick: (id: string) => onmoveto!(id) } }),
              },
            ]
          : []),
        ...(ondelete ? [{ label: 'Delete', onselect: ondelete, danger: true }] : []),
      ]}
    />
  {/if}
</div>
{#if moving}
  <MovePicker
    heading="Move “{link.title}” to"
    groups={places}
    onmove={(id) => {
      moving = false;
      onmoveto?.(id);
    }}
    oncancel={() => (moving = false)}
  />
{/if}

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
  .row:not(:hover, :focus-within) > :global(.menu:not(.open)) {
    opacity: 0;
  }
  /* The pointer drags the link itself, so the grip is only for the keyboard: it ignores the
     pointer and shows as an outline around the row when tabbed to. */
  .row > :global(.grip) {
    position: absolute;
    inset: 0;
    width: auto;
    height: auto;
    border-radius: 6px;
    opacity: 0;
    pointer-events: none;
  }
  .row > :global(.grip:focus-visible) {
    opacity: 1;
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .row > :global(.grip svg) {
    visibility: hidden;
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
</style>
