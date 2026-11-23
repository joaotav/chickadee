<script lang="ts">
  import { outside } from '@/lib/outside';
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
  // The box listing the other places, opened by clicking the mark.
  let showing = $state(false);
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
  <LinkIcon {link} />
  <span class="text">
    <span class="title">{link.title}</span>
    <!-- Shown only with the "Title and URL" setting. The tooltip already gives the URL to screen readers. -->
    <span class="url" aria-hidden="true">{link.url.replace(/^https?:\/\//, '')}</span>
  </span>
  {#if duplicate}
    <span class="visually-hidden">. {alsoText}</span>
  {/if}
{/snippet}

<svelte:window onkeydown={(event) => showing && event.key === 'Escape' && (showing = false)} />

<div class="row" class:duplicate={duplicate && !editing} bind:this={row}>
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
  {#if duplicate && !editing}
    <!-- PROTOTYPE (#45): the mark, a button of its own beside the link, since a link can't hold one. -->
    <div class="dup" class:open={showing} {@attach outside(() => (showing = false))}>
      <button
        class="mark {proto.variant}"
        title="Saved {alsoIn.length + 1} times"
        aria-label="Saved {alsoIn.length + 1} times"
        aria-expanded={showing}
        onclick={() => (showing = !showing)}
      >
        {#if proto.variant === 'a'}
          ×{alsoIn.length + 1}
        {:else if proto.variant === 'b'}
          <!-- Lucide's "triangle-alert" icon, https://lucide.dev, ISC license. -->
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        {:else if proto.variant === 'c'}
          ?
        {:else}
          <!-- Lucide's "copy" icon, https://lucide.dev, ISC license. -->
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          {alsoIn.length + 1}
        {/if}
      </button>
      {#if showing}
        <div class="also" role="dialog" aria-label="Also saved in">
          <strong>Also saved in</strong>
          <ul>
            {#each alsoIn as place, i (i)}
              <li>{place}</li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
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
  /* PROTOTYPE (#45): the duplicate mark is a button of its own, so only it reacts to the pointer. */
  .row:has(> .dup:hover) > :global(.menu:not(.open)) {
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
  /* The mark sits near the end of the row, just left of where the ⋯ button shows on hover,
     so it never moves out from under the pointer. */
  .row.duplicate .link {
    padding-right: 64px;
  }
  .dup {
    position: absolute;
    right: 32px;
  }
  .mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 22px;
    height: 22px;
    padding: 0 4px;
    border-radius: 5px;
    background: var(--row);
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
  }
  .row:hover .mark {
    background: var(--row-hover);
  }
  .mark:hover,
  .open .mark {
    color: var(--fg);
  }
  .mark.a {
    height: 16px;
    min-width: 0;
    padding: 0 5px;
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 10px;
  }
  .mark.b,
  .mark.b:hover,
  .open .mark.b {
    color: var(--danger);
  }
  .mark.c {
    width: 16px;
    min-width: 0;
    height: 16px;
    padding: 0;
    border: 1.5px solid currentColor;
    border-radius: 50%;
    font-size: 10px;
  }
  .mark svg {
    width: 13px;
    height: 13px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .also {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: max-content;
    min-width: 180px;
    max-width: 300px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    box-shadow: 0 8px 24px #0006;
    font-size: 12px;
  }
  .also ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .also li {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
