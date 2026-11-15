<script lang="ts">
  import { onMount } from 'svelte';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import { proto } from '@/lib/prototype.svelte';
  import type { Space } from '@/lib/tree';

  let {
    spaces,
    activeId,
    unsortedId,
    onselect,
    onmove,
  }: {
    spaces: Space[];
    activeId: string | undefined;
    /** The "Unsorted" tab isn't a folder of its own, so it stays last and can't be moved. */
    unsortedId: string | undefined;
    onselect: (id: string) => void;
    /** A space dropped before `before`, or at the end without it. */
    onmove: (id: string, before: string | undefined) => void;
  } = $props();

  // PROTOTYPE: how the tabs cope when they don't fit. A shows only the tabs that fit, and puts
  // the rest in a menu. B lets the tabs scroll on their own. C wraps them. D is today's.
  let root: HTMLElement;
  let measurer: HTMLElement;
  let room = $state(Infinity);
  let widths = $state<Record<string, number>>({});
  const GAP = 2;
  // The track's padding and border.
  const PAD = 8;

  const ordered = $derived([...spaces.filter((space) => space.id !== unsortedId), ...spaces.filter((space) => space.id === unsortedId)]);

  // A: the tabs that fit, always with the selected one, and room left for the menu.
  const shown = $derived.by(() => {
    if (proto.variant !== 'a' || room === Infinity) return null;
    const width = (space: Space) => widths[space.id] ?? 0;
    if (ordered.reduce((sum, space) => sum + width(space) + GAP, PAD) <= room) return null;
    let used = PAD + (widths.more ?? 0);
    const kept: Space[] = [];
    for (const space of ordered) {
      if (used + width(space) > room) break;
      kept.push(space);
      used += width(space) + GAP;
    }
    const selected = ordered.find((space) => space.id === activeId);
    if (selected && !kept.includes(selected)) {
      while (kept.length > 0 && used + width(selected) > room) used -= width(kept.pop()!) + GAP;
      kept.push(selected);
    }
    return new Set(kept.map((space) => space.id));
  });
  const isShown = (space: Space) => !shown || shown.has(space.id);
  const hidden = $derived(ordered.filter((space) => !isShown(space)));

  // Room for the tabs: all of the parent, less its other children.
  function measureRoom() {
    const parent = root.parentElement!;
    const gap = parseFloat(getComputedStyle(parent).columnGap) || 0;
    const others = [...parent.children].filter((child) => child !== root) as HTMLElement[];
    room = parent.clientWidth - others.reduce((sum, child) => sum + child.offsetWidth + gap, 0);
    widths = Object.fromEntries(
      [...measurer.children].map((child) => [(child as HTMLElement).dataset.id!, (child as HTMLElement).offsetWidth]),
    );
  }

  // Follows the dragged tab around, until the move is saved and the spaces come back from
  // the browser.
  let movable = $derived(spaces.filter((space) => space.id !== unsortedId && isShown(space)));
  const unsorted = $derived(spaces.find((space) => space.id === unsortedId));
  const FLIP_MS = 150;

  function drop({ detail }: CustomEvent<DndEvent<Space>>) {
    movable = detail.items;
    const ids = movable.map((space) => space.id);
    const before = spaces.filter((space) => space.id !== unsortedId && isShown(space)).map((space) => space.id);
    if (ids.join() !== before.join()) onmove(detail.info.id, ids[ids.indexOf(detail.info.id) + 1]);
  }

  let track: HTMLElement;
  let indicator = $state({ left: 0, top: 3, width: 0 });
  // Off for the first measurement, so the pill appears in place instead of sliding in from the left.
  let animated = $state(false);

  function measure() {
    const tab = track?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!tab) return;
    indicator = { left: tab.offsetLeft, top: tab.offsetTop, width: tab.offsetWidth };
    if (!animated) requestAnimationFrame(() => (animated = true));
  }

  // Runs after the DOM updates whenever the active tab or the list of tabs changes, including
  // while a tab is dragged, so the pill follows the gap it leaves.
  $effect(() => {
    void activeId;
    void spaces;
    void movable;
    void proto.variant;
    measure();
  });

  $effect(() => {
    void spaces;
    void proto.variant;
    measureRoom();
  });

  // B: the selected tab scrolls into view, and the mouse wheel scrolls the tabs sideways.
  let fadeStart = $state(false);
  let fadeEnd = $state(false);
  function updateFades() {
    fadeStart = proto.variant === 'b' && track.scrollLeft > 0;
    fadeEnd = proto.variant === 'b' && track.scrollLeft + track.clientWidth < track.scrollWidth - 1;
  }
  $effect(() => {
    void activeId;
    void proto.variant;
    if (proto.variant === 'b') track.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    updateFades();
  });
  const wheel = (node: HTMLElement) => {
    const onwheel = (event: WheelEvent) => {
      if (proto.variant !== 'b' || event.deltaX !== 0 || node.scrollWidth <= node.clientWidth) return;
      event.preventDefault();
      node.scrollLeft += event.deltaY;
    };
    node.addEventListener('wheel', onwheel, { passive: false });
    return () => node.removeEventListener('wheel', onwheel);
  };

  let listOpen = $state(false);
  let list = $state<HTMLElement>();
  function pick(id: string) {
    listOpen = false;
    onselect(id);
  }

  // Long names are cut short. Hovering shows the whole name, only when it's cut.
  function tooltip(event: MouseEvent, space: Space) {
    const tab = event.currentTarget as HTMLElement;
    const name = tab.querySelector<HTMLElement>('.name')!;
    tab.title = name.scrollWidth > name.clientWidth ? space.name : '';
  }

  onMount(() => {
    const remeasure = () => {
      measureRoom();
      measure();
      updateFades();
    };
    // Emoji fonts can load after the first measurement and change tab widths.
    void document.fonts.ready.then(remeasure);
    const observer = new ResizeObserver(remeasure);
    observer.observe(root.parentElement!);
    return () => observer.disconnect();
  });
</script>

<svelte:window
  onpointerdown={(event) => listOpen && !list?.contains(event.target as Node) && (listOpen = false)}
  onkeydown={(event) => event.key === 'Escape' && (listOpen = false)}
/>

<div class="strip variant-{proto.variant}" bind:this={root}>
  <!-- Every tab at its full width, out of sight, so A knows how many fit. -->
  <div class="measurer" aria-hidden="true" bind:this={measurer}>
    {#each ordered as space (space.id)}
      <span class="tab" data-id={space.id}>{@render label(space)}</span>
    {/each}
    <span class="tab more" data-id="more">99 more ▾</span>
  </div>

  <div
    class="track"
    class:fade-start={fadeStart}
    class:fade-end={fadeEnd}
    role="tablist"
    bind:this={track}
    onscroll={updateFades}
    {@attach wheel}
  >
    <span
      class="indicator"
      class:animated
      style:width="{indicator.width}px"
      style:top="{indicator.top}px"
      style:transform="translateX({indicator.left}px)"
    ></span>
    <!-- The library's automatic roles would replace the tab roles, so they're off. -->
    <div
      class="tabs"
      use:dndzone={{
        items: movable,
        type: 'space',
        flipDurationMs: FLIP_MS,
        zoneTabIndex: -1,
        dropTargetStyle: {},
        autoAriaDisabled: true,
        useCursorForDetection: true,
      }}
      onconsider={({ detail }) => (movable = detail.items)}
      onfinalize={drop}
    >
      {#each movable as space (space.id)}
        <button
          class="tab"
          role="tab"
          aria-selected={space.id === activeId}
          onclick={() => onselect(space.id)}
          onmouseenter={(event) => tooltip(event, space)}
          animate:flip={{ duration: FLIP_MS }}
        >
          {@render label(space)}
        </button>
      {/each}
    </div>
    {#if unsorted && isShown(unsorted)}
      <button class="tab" role="tab" aria-selected={unsorted.id === activeId} onclick={() => onselect(unsorted.id)}>
        {@render label(unsorted)}
      </button>
    {/if}
    {#if hidden.length > 0}
      <button class="tab more" aria-haspopup="menu" aria-expanded={listOpen} onclick={() => (listOpen = !listOpen)}>
        {hidden.length} more ▾
      </button>
    {/if}
  </div>

  {#if proto.variant === 'b'}
    <button class="all" aria-label="All spaces" aria-haspopup="menu" aria-expanded={listOpen} onclick={() => (listOpen = !listOpen)}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
    </button>
  {/if}

  {#if listOpen}
    <div class="list" role="menu" bind:this={list}>
      {#each proto.variant === 'a' ? hidden : ordered as space (space.id)}
        <button role="menuitem" class:current={space.id === activeId} onclick={() => pick(space.id)}>
          <span class="check" aria-hidden="true">{space.id === activeId ? '✓' : ''}</span>
          {@render label(space)}
        </button>
      {/each}
    </div>
  {/if}
</div>

{#snippet label(space: Space)}
  {#if space.emoji}<span class="emoji">{space.emoji}</span>{/if}
  <span class="name">{space.name}</span>
{/snippet}

<style>
  .strip {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  /* D: as today, the tabs never shrink, so the page gets wider. */
  .variant-d {
    flex: none;
  }
  .measurer {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    visibility: hidden;
    pointer-events: none;
  }
  .track {
    position: relative;
    display: flex;
    gap: 2px;
    min-width: 0;
    padding: 3px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
  }
  .tabs {
    display: flex;
    gap: 2px;
  }
  /* B: the tabs scroll inside the track, with a thin scrollbar and faded edges. */
  .variant-b .track {
    overflow-x: auto;
    scrollbar-width: none;
  }
  .variant-b .track.fade-start {
    mask-image: linear-gradient(to right, transparent, #000 32px);
  }
  .variant-b .track.fade-end {
    mask-image: linear-gradient(to left, transparent, #000 32px);
  }
  .variant-b .track.fade-start.fade-end {
    mask-image: linear-gradient(to right, transparent, #000 32px, #000 calc(100% - 32px), transparent);
  }
  /* C: the tabs wrap onto more rows. */
  .variant-c .track,
  .variant-c .tabs {
    flex-wrap: wrap;
  }
  .indicator {
    position: absolute;
    left: 0;
    height: 30px;
    border-radius: 7px;
    background: var(--row-hover);
    box-shadow: 0 1px 3px #0004;
    pointer-events: none;
  }
  .indicator.animated {
    transition:
      transform 0.25s cubic-bezier(0.3, 0.7, 0.4, 1),
      top 0.25s cubic-bezier(0.3, 0.7, 0.4, 1),
      width 0.25s cubic-bezier(0.3, 0.7, 0.4, 1);
  }
  .tab {
    position: relative;
    display: flex;
    flex: none;
    align-items: center;
    gap: 7px;
    height: 30px;
    padding: 0 14px;
    border-radius: 7px;
    color: var(--muted);
    font-weight: 500;
    white-space: nowrap;
    transition: color 0.15s;
  }
  .tab:hover,
  .tab[aria-selected='true'] {
    color: var(--fg);
  }
  .more {
    padding: 0 10px;
  }
  /* The copy that follows the pointer is outside the track, away from the pill. */
  .tab:global(#dnd-action-dragged-el) {
    background: var(--row-hover);
    color: var(--fg);
  }
  .emoji {
    font-size: 14px;
    line-height: 1;
  }
  .name {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .all {
    display: grid;
    flex: none;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    color: var(--muted);
  }
  .all:hover,
  .all[aria-expanded='true'] {
    background: var(--row-hover);
    color: var(--fg);
  }
  .all svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .list {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    min-width: 200px;
    max-height: 60vh;
    padding: 4px;
    overflow-y: auto;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    box-shadow: 0 8px 24px #0006;
  }
  .list button {
    display: flex;
    flex: none;
    align-items: center;
    gap: 7px;
    padding: 6px 10px 6px 4px;
    border-radius: 5px;
    text-align: left;
    white-space: nowrap;
  }
  .list button:hover {
    background: var(--row-hover);
  }
  .list .current {
    font-weight: 600;
  }
  .check {
    width: 14px;
    color: var(--accent);
    text-align: center;
  }
</style>
