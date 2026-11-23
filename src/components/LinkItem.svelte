<script lang="ts">
  import { proto } from '@/lib/prototype.svelte';
  import { defaultTitle, type Link } from '@/lib/tree';
  import Grip from './Grip.svelte';
  import LinkForm from './LinkForm.svelte';
  import LinkIcon from './LinkIcon.svelte';
  import Menu, { type PlaceGroup } from './Menu.svelte';

  let {
    link,
    onupdate,
    ondelete,
    places = [],
    onmove,
    alsoIn = [],
  }: {
    link: Link;
    /** Changes the link's title, URL or both. Without it, the link can't be edited. */
    onupdate?: (changes: { title?: string; url?: string }) => void;
    ondelete?: () => void;
    /** The categories the link can move to, by space, and moving it to one. */
    places?: PlaceGroup[];
    onmove?: (categoryId: string) => void;
    /** PROTOTYPE (#45): the other places this link is saved in, when it's saved more than once. */
    alsoIn?: string[];
  } = $props();

  const duplicate = $derived(alsoIn.length > 0);
  // Added to the tooltip, and read out after the title.
  const alsoText = $derived(duplicate ? `Also in ${alsoIn.join(', ')}` : '');
  const tooltip = $derived([link.title, link.url, alsoText].filter(Boolean).join('\n'));

  let editing = $state(false);

  function save(url: string, title: string) {
    // An empty title goes back to the default, the same as adding a link without one.
    const newTitle = title || defaultTitle(url);
    const changes = { ...(url !== link.url && { url }), ...(newTitle !== link.title && { title: newTitle }) };
    if (Object.keys(changes).length > 0) onupdate?.(changes);
    editing = false;
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
  {#if duplicate && proto.variant === 'c'}
    <span class="icon-with-dot"><LinkIcon {link} /><span class="dot" aria-hidden="true"></span></span>
  {:else}
    <LinkIcon {link} />
  {/if}
  <span class="text">
    <span class="title">{link.title}</span>
    <!-- Shown only with the "Title and URL" setting. The tooltip already gives the URL to screen readers. -->
    <span class="url" aria-hidden="true">{link.url.replace(/^https?:\/\//, '')}</span>
  </span>
  {#if duplicate}
    <span class="visually-hidden">. {alsoText}</span>
    {#if proto.variant === 'a'}
      <span class="count" aria-hidden="true">×{alsoIn.length + 1}</span>
    {:else if proto.variant === 'b'}
      <!-- Lucide's "copy" icon, https://lucide.dev, ISC license. -->
      <svg class="copies" viewBox="0 0 24 24" aria-hidden="true">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
    {/if}
  {/if}
{/snippet}

<div class="row" bind:this={row}>
  {#if editing}
    <LinkForm url={link.url} title={link.title} submit="Save" onsave={save} oncancel={() => (editing = false)} />
  {:else if link.openable}
    <a class="link" href={link.url} title={tooltip} onmousedown={dragFromLink}>{@render content()}</a>
  {:else}
    <span
      class="link disabled"
      title={`${tooltip}\nOnly web links can be opened from this page.`}
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
        { label: 'Edit bookmark', onselect: () => (editing = true) },
        ...(onmove && places.length > 0 ? [{ label: 'Move to…', places: { groups: places, onpick: onmove } }] : []),
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

  /* PROTOTYPE (#45): the duplicate marks. */
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .count {
    flex-shrink: 0;
    padding: 0 5px;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--muted);
    font-size: 10px;
    line-height: 14px;
  }
  .copies {
    flex-shrink: 0;
    width: 13px;
    height: 13px;
    margin-left: auto;
    fill: none;
    stroke: var(--muted);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .icon-with-dot {
    position: relative;
    display: flex;
    flex-shrink: 0;
  }
  .dot {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 7px;
    height: 7px;
    border: 1.5px solid var(--row);
    border-radius: 50%;
    background: var(--accent);
  }
</style>
