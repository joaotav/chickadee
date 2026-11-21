<script lang="ts">
  import { proto } from '@/lib/prototype.svelte';
  import { createPrototypeSearch, type Item, type Result } from '@/lib/search';
  import type { Space } from '@/lib/tree';
  import LinkIcon from './LinkIcon.svelte';

  let {
    spaces,
    onopen,
    onplace,
  }: {
    spaces: Space[];
    /** Opens a result here, or in a background tab, which keeps the search open. */
    onopen: (url: string, background: boolean) => void;
    /** PROTOTYPE: goes to a space, or to a category's card. */
    onplace: (spaceId: string, categoryId?: string) => void;
  } = $props();

  let input: HTMLInputElement;
  let query = $state('');
  let focused = $state(false);
  let selected = $state(0);

  const search = $derived(createPrototypeSearch(spaces, proto.variant));
  const results = $derived(search(query));
  const open = $derived(focused && query.trim() !== '');

  // Macs use Cmd where other systems use Ctrl.
  const mod = /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl';

  // Grouped variants list the places first, under a heading of their own.
  const grouped = $derived(proto.variant === 'c' || proto.variant === 'd');
  const placeCount = $derived(results.filter((item) => item.kind !== 'link').length);

  function choose(item: Item, background: boolean) {
    if (item.kind === 'link') return onopen(item.link.url, background);
    onplace(item.spaceId, item.categoryId);
    query = '';
    input.blur();
  }

  function move(by: number) {
    if (results.length === 0) return;
    selected = (selected + by + results.length) % results.length;
    document.getElementById(`search-result-${selected}`)?.scrollIntoView({ block: 'nearest' });
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && open && results[selected]) {
      event.preventDefault();
      choose(results[selected]!, event.ctrlKey || event.metaKey);
    } else if (event.key === 'Escape') {
      if (query) query = '';
      else input.blur();
    }
  }

  // "/" jumps to the search box, unless it's typed into a field.
  function onWindowKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const typing = target.closest('input, textarea, select, [contenteditable]');
    if (event.key !== '/' || typing || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    input.focus();
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#snippet highlighted(parts: Result['title'])}
  {#each parts as part, i (i)}
    {#if part.match}<mark>{part.text}</mark>{:else}{part.text}{/if}
  {/each}
{/snippet}

<div class="search">
  <input
    bind:this={input}
    bind:value={query}
    type="text"
    role="combobox"
    aria-label="Search all spaces"
    aria-expanded={open}
    aria-controls="search-results"
    aria-autocomplete="list"
    aria-activedescendant={open && results.length > 0 ? `search-result-${selected}` : undefined}
    placeholder="Search all spaces"
    spellcheck="false"
    autocomplete="off"
    oninput={() => (selected = 0)}
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
    {onkeydown}
  />
  {#if !query}<kbd aria-hidden="true">/</kbd>{/if}
  {#if open}
    <div class="dropdown">
      {#if results.length > 0}
        <ul id="search-results" role="listbox" aria-label="Search results">
          {#each results as item, i (item.kind === 'link' ? item.link.id : (item.categoryId ?? item.spaceId))}
            {#if grouped && i === 0 && placeCount > 0}
              <li class="group" role="presentation">Spaces and categories</li>
            {/if}
            {#if grouped && i === placeCount && item.kind === 'link'}
              <li class="group" role="presentation">Bookmarks</li>
            {/if}
            <!-- The search box keeps focus and handles the keyboard, as in any combobox. A
                 mousedown would take the focus away, closing the list before the click. -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <li
              id="search-result-{i}"
              title={item.kind === 'link' ? item.link.url : undefined}
              role="option"
              aria-selected={i === selected}
              onmousedown={(event) => event.preventDefault()}
              onmousemove={() => (selected = i)}
              onclick={(event) => choose(item, event.ctrlKey || event.metaKey)}
              onauxclick={(event) => event.button === 1 && item.kind === 'link' && choose(item, true)}
            >
              {#if item.kind === 'link'}
                <LinkIcon link={item.link} />
                <span class="text">
                  <span class="title">{@render highlighted(item.title)}</span>
                  <span class="where">
                    {#if item.placeParts}{@render highlighted(item.placeParts)}{:else}{item.place}{/if}
                    · {@render highlighted(item.address)}
                  </span>
                </span>
              {:else}
                {#if item.kind === 'space'}
                  <span class="place-icon">{item.emoji ?? '▦'}</span>
                {:else}
                  <svg class="place-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3" width="11" height="10" rx="2" /><path d="M2.5 6h11" /></svg>
                {/if}
                <span class="text">
                  <span class="title">{@render highlighted(item.name)}</span>
                  <span class="where">
                    {#if item.kind === 'space'}Space · {item.count} bookmarks{:else}Category in {item.within} · {item.count} bookmarks{/if}
                  </span>
                </span>
                <span class="go">Go to</span>
              {/if}
            </li>
          {/each}
        </ul>
        <!-- Hidden from screen readers, which announce the results as a list to pick from. -->
        <p class="keys" aria-hidden="true">
          <span><kbd>↑↓</kbd> Select</span>
          <span><kbd>↵</kbd> {results[selected]?.kind === 'link' || !results[selected] ? 'Open' : 'Go to'}</span>
          <span><kbd>{mod} ↵</kbd> or <kbd>{mod}</kbd>+<kbd>Click</kbd> Open in new tab</span>
        </p>
      {:else}
        <p class="none">Nothing matches</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .search {
    position: relative;
  }
  input {
    width: 220px;
    height: 30px;
    padding: 0 28px 0 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    outline: none;
    background: var(--bg);
    color: var(--fg);
    font: inherit;
  }
  input:focus {
    border-color: var(--accent);
  }
  input::placeholder {
    color: var(--muted);
  }
  .search > kbd {
    position: absolute;
    top: 50%;
    right: 8px;
    padding: 0 5px;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--muted);
    font-size: 11px;
    line-height: 16px;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 20;
    width: 380px;
    max-width: calc(100vw - 32px);
    padding: 6px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    box-shadow: 0 12px 32px #0006;
  }
  ul {
    max-height: 60vh;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 7px 8px;
    border-radius: 6px;
    cursor: pointer;
  }
  li[aria-selected='true'] {
    background: var(--row-hover);
  }
  li > :global(.icon) {
    margin-top: 1px;
  }
  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .title,
  .where {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .where {
    color: var(--muted);
    font-size: 11px;
  }
  mark {
    background: none;
    color: var(--accent);
    font-weight: 600;
  }
  /* Wraps onto a second line if a wide font doesn't leave room for one. */
  .keys {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin: 6px 0 0;
    padding: 8px 8px 2px;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 11px;
  }
  .keys span {
    display: flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;
  }
  .keys kbd {
    min-width: 16px;
    padding: 0 4px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    font: inherit;
    line-height: 15px;
    text-align: center;
  }
  .group {
    padding: 8px 8px 4px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    cursor: default;
  }
  .group:not(:first-child) {
    margin-top: 4px;
    border-top: 1px solid var(--border);
    border-radius: 0;
  }
  .place-icon {
    flex: none;
    width: 16px;
    height: 16px;
    margin-top: 1px;
    font-size: 14px;
    line-height: 16px;
    text-align: center;
  }
  svg.place-icon {
    fill: none;
    stroke: var(--muted);
    stroke-width: 1.4;
  }
  .go {
    margin-left: auto;
    align-self: center;
    padding: 1px 6px;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--muted);
    font-size: 11px;
    white-space: nowrap;
  }
  .none {
    margin: 0;
    padding: 8px;
    color: var(--muted);
  }
</style>
