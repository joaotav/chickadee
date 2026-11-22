<script lang="ts" module>
  /** Places in one space, under its name. */
  export interface PlaceGroup {
    label?: string;
    places: { id: string; label: string }[];
  }

  export interface MenuItem {
    label: string;
    /** Runs when the item is chosen, unless it has `places`. */
    onselect?: () => void;
    /** Shown in red, for actions like Delete. */
    danger?: boolean;
    /** Places the menu switches to when the item is chosen, with a search field above them. */
    places?: { groups: PlaceGroup[]; onpick: (id: string) => void };
  }

  // Lowercase and without accents, so "midia" matches "Mídia".
  const plain = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
</script>

<script lang="ts">
  import { tick } from 'svelte';

  let {
    label,
    items,
    align = 'right',
    text,
  }: {
    label: string;
    items: MenuItem[];
    /** Shown on the button instead of ⋯. */
    text?: string;
    /** Which edge of the button the list lines up with. Left suits a button near the left of the page. */
    align?: 'left' | 'right';
  } = $props();

  let open = $state(false);
  let root: HTMLElement;
  let toggleButton: HTMLButtonElement;
  let list = $state<HTMLElement>();

  // The item whose places are shown, the search typed above them and the highlighted place.
  let chosen = $state<MenuItem | null>(null);
  let search = $state('');
  let active = $state(0);
  // The places keep the width they open with, all of them shown, so a search doesn't make
  // the menu narrower. One too wide for the room left of the button opens to its right.
  let width = $state<number>();
  let flip = $state(false);

  const groups = $derived.by(() => {
    const words = plain(search).split(/\s+/).filter(Boolean);
    return (chosen?.places?.groups ?? [])
      .map((group) => ({
        ...group,
        places: group.places.filter((place) => {
          const text = plain(`${group.label ?? ''} ${place.label}`);
          return words.every((word) => text.includes(word));
        }),
      }))
      .filter((group) => group.places.length > 0);
  });
  const places = $derived(groups.flatMap((group) => group.places));

  $effect(() => {
    if (!open) chosen = null;
  });

  $effect(() => {
    search = '';
    active = 0;
    width = undefined;
    flip = false;
    if (chosen && list) {
      const rect = list.getBoundingClientRect();
      width = rect.width;
      flip = align === 'right' && rect.left < 8;
    }
  });

  function select(item: MenuItem) {
    if (item.places) {
      chosen = item;
      return;
    }
    open = false;
    item.onselect?.();
  }

  function pick(id: string) {
    const onpick = chosen!.places!.onpick;
    open = false;
    onpick(id);
  }

  async function back() {
    chosen = null;
    await tick();
    list?.querySelector('button')?.focus();
  }

  // The arrow keys move the highlight while the search field keeps the focus.
  async function onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && places[active]) {
      pick(places[active]!.id);
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && places.length > 0) {
      event.preventDefault();
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + places.length) % places.length;
      await tick();
      list?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
    }
  }

  const focus = (element: HTMLElement) => element.focus();

  // A click anywhere outside the menu closes it. The click's path, not its target, since a
  // click that switches the list removes its target from the page.
  function onWindowClick(event: MouseEvent) {
    if (open && !event.composedPath().includes(root)) open = false;
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') {
      open = false;
      toggleButton.focus();
    }
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="menu" class:open bind:this={root}>
  <button class="toggle" class:text aria-label={label} aria-expanded={open} bind:this={toggleButton} onclick={() => (open = !open)}>
    {#if text}
      {text}
    {:else}
      <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.5" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12.5" cy="8" r="1.3" /></svg>
    {/if}
  </button>
  {#if open}
    <div
      class="items"
      class:left={align === 'left' || flip}
      class:with-places={chosen}
      style:width={chosen && width ? `${width}px` : undefined}
      bind:this={list}
    >
      {#if chosen}
        <!-- Stay in place while the places below scroll. -->
        <div class="head">
          <button class="back" onclick={back}>‹ {chosen.label.replace(/…$/, '')}</button>
          <input
            type="text"
            placeholder="Search"
            aria-label="Search places"
            spellcheck="false"
            autocomplete="off"
            bind:value={search}
            oninput={() => (active = 0)}
            onkeydown={onSearchKeydown}
            {@attach focus}
          />
        </div>
        <div class="places">
          <!-- Not keyed: two spaces or categories can share a name. -->
          {#each groups as group}
            {#if group.label}<span class="group">{group.label}</span>{/if}
            {#each group.places as place}
              <button
                class:active={place === places[active]}
                onmousemove={() => (active = places.indexOf(place))}
                onclick={() => pick(place.id)}>{place.label}</button
              >
            {/each}
          {:else}
            <span class="none">No matches</span>
          {/each}
        </div>
      {:else}
        <!-- Not keyed: two items can share a label, like two spaces with the same name. -->
        {#each items as item}
          <button class:danger={item.danger} onclick={() => select(item)}>{item.label}</button>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .menu {
    position: relative;
    flex: none;
  }
  .toggle {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 5px;
    color: var(--muted);
  }
  .toggle.text {
    width: auto;
    height: 30px;
    padding: 0 10px;
    border-radius: 7px;
    font-weight: 500;
    white-space: nowrap;
  }
  .toggle:hover,
  .open .toggle {
    background: var(--row-hover);
    color: var(--fg);
  }
  svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }
  .items {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    min-width: 140px;
    max-height: 60vh;
    padding: 4px;
    overflow-y: auto;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    box-shadow: 0 8px 24px #0006;
  }
  .items.left {
    right: auto;
    left: 0;
  }
  .items button {
    flex: none;
    max-width: 320px;
    padding: 6px 10px;
    overflow: hidden;
    border-radius: 5px;
    text-align: left;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .items button:hover,
  .items .active {
    background: var(--row-hover);
  }
  .with-places {
    overflow: hidden;
  }
  .head {
    display: flex;
    flex: none;
    flex-direction: column;
  }
  .back {
    color: var(--muted);
  }
  input {
    height: 28px;
    margin: 2px 2px 6px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    outline: none;
    background: var(--bg);
    color: var(--fg);
    font: inherit;
    transition: border-color 0.15s;
  }
  input:focus {
    border-color: var(--accent);
  }
  input::placeholder {
    color: var(--muted);
  }
  .places {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }
  .group {
    padding: 6px 10px 2px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
  }
  .none {
    padding: 6px 10px;
    color: var(--muted);
  }
  .items .danger {
    color: var(--danger);
  }
</style>
