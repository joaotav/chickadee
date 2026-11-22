<script lang="ts" module>
  import type { PlaceGroup } from './MovePicker.svelte';

  export interface MenuItem {
    label: string;
    onselect: () => void;
    /** PROTOTYPE (#59, variant A): a list of places the menu swaps to, instead of `onselect`. */
    places?: { groups: PlaceGroup[]; onpick: (id: string) => void };
    /** Shown in red, for actions like Delete. */
    danger?: boolean;
  }
</script>

<script lang="ts">
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

  let sub = $state<MenuItem | null>(null);
  $effect(() => {
    if (!open) sub = null;
  });

  function select(item: MenuItem) {
    if (item.places) {
      sub = item;
      return;
    }
    open = false;
    item.onselect();
  }

  // A click anywhere outside the menu closes it.
  function onWindowClick(event: MouseEvent) {
    // The path, not the target: a click that swaps the list removes its target from the page.
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
    <div class="items" class:left={align === 'left'}>
      {#if sub?.places}
        {@const places = sub.places}
        <button class="back" onclick={() => (sub = null)}>‹ {sub.label.replace('…', '')}</button>
        {#each places.groups as group}
          {#if group.label}<span class="group">{group.label}</span>{/if}
          {#each group.places as place}
            <button
              onclick={() => {
                open = false;
                places.onpick(place.id);
              }}>{place.label}</button
            >
          {/each}
        {/each}
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
  .items button:hover {
    background: var(--row-hover);
  }
  .items .back {
    margin-bottom: 2px;
    color: var(--muted);
  }
  .items .group {
    padding: 6px 10px 2px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
  }
  .items .danger {
    color: var(--danger);
  }
</style>
