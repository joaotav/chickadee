<script lang="ts">
  import { onMount } from 'svelte';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import Menu from '@/components/Menu.svelte';
  import { fitTabs } from '@/lib/fit';
  import { joinEmoji, type Space } from '@/lib/tree';

  let {
    spaces,
    activeId,
    unsortedId,
    room,
    onselect,
    onmove,
    onrename,
    ondelete,
  }: {
    spaces: Space[];
    activeId: string | undefined;
    /** The "Unsorted" tab isn't a folder of its own, so it stays last and can't be moved. */
    unsortedId: string | undefined;
    /** How wide the tabs can be, in pixels. The ones that don't fit are listed in a menu. */
    room: number;
    onselect: (id: string) => void;
    /** A space dropped before `before`, or at the end without it. */
    onmove: (id: string, before: string | undefined) => void;
    /** Rename or Delete for the selected space, from its tab's ⋯ menu, with the tab to show a form under. */
    onrename: (tab: HTMLElement) => void;
    ondelete: (tab: HTMLElement) => void;
  } = $props();

  const unsorted = $derived(spaces.find((space) => space.id === unsortedId));
  const ordered = $derived([...spaces.filter((space) => space.id !== unsortedId), ...(unsorted ? [unsorted] : [])]);

  // Only the selected space's tab has a ⋯ menu, so it's clear which space the menu changes.
  // Unsorted has none.
  const selected = $derived(ordered.find((space) => space.id === activeId && space.id !== unsortedId));

  // The tabs that fit are shown, always with the selected one, and the rest are listed in a
  // menu. A hidden copy of every tab gives their full widths. Until that and the room are
  // measured, all show.
  let measurer: HTMLElement;
  let widths = $state<Record<string, number>>({});
  const MORE = 'more';
  // The gap between tabs, and the track's padding and border.
  const GAP = 2;
  const PAD = 8;
  const shown = $derived.by(() => {
    if (!(MORE in widths) || room <= 0) return new Set(ordered.map((space) => space.id));
    const fit = fitTabs(
      ordered.map((space) => widths[space.id] ?? 0),
      ordered.findIndex((space) => space.id === activeId),
      room - PAD,
      widths[MORE]! + GAP,
      GAP,
    );
    return new Set(fit.map((index) => ordered[index]!.id));
  });
  const hidden = $derived(ordered.filter((space) => !shown.has(space.id)));

  function measureWidths() {
    widths = Object.fromEntries(
      [...measurer.children].map((child) => [(child as HTMLElement).dataset.id!, Math.ceil(child.getBoundingClientRect().width)]),
    );
  }

  // Runs after the DOM updates whenever a tab is added, renamed, moved or removed, or the
  // selected one changes, since it's wider.
  $effect(() => {
    void ordered;
    void selected;
    measureWidths();
  });

  // Follows the dragged tab around, until the move is saved and the spaces come back from
  // the browser. Only the tabs shown can be dragged.
  let movable = $derived(ordered.filter((space) => space.id !== unsortedId && shown.has(space.id)));
  const FLIP_MS = 150;

  function drop({ detail }: CustomEvent<DndEvent<Space>>) {
    movable = detail.items;
    const ids = movable.map((space) => space.id);
    const before = ordered.filter((space) => space.id !== unsortedId && shown.has(space.id)).map((space) => space.id);
    if (ids.join() !== before.join()) onmove(detail.info.id, ids[ids.indexOf(detail.info.id) + 1]);
  }

  // Long names are cut short. Hovering over one shows the whole name, only when it's cut.
  function showCutName(event: MouseEvent, space: Space) {
    const tab = event.currentTarget as HTMLElement;
    const name = tab.querySelector<HTMLElement>('.name')!;
    tab.title = name.scrollWidth > name.clientWidth ? space.name : '';
  }

  let track: HTMLElement;
  const selectedTab = () => track.querySelector<HTMLElement>('[aria-selected="true"]')!;
  let indicator = $state({ left: 0, width: 0 });
  // Off for the first measurement, so the pill appears in place instead of sliding in from the left.
  let animated = $state(false);

  function measure() {
    const tab = track && selectedTab();
    if (!tab) return;
    indicator = { left: tab.offsetLeft, width: tab.offsetWidth };
    if (!animated) requestAnimationFrame(() => (animated = true));
  }

  // Runs after the DOM updates whenever the active tab or the list of tabs changes, including
  // while a tab is dragged, so the pill follows the gap it leaves.
  $effect(() => {
    void activeId;
    void spaces;
    void movable;
    measure();
  });

  onMount(() => {
    // Emoji fonts can load after the first measurement and change tab widths.
    void document.fonts.ready.then(() => {
      measureWidths();
      measure();
    });
    addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  });
</script>

<div class="track" bind:this={track}>
  <!-- Every tab at its full width, out of sight, to work out which ones fit. -->
  <div class="measurer" aria-hidden="true">
    <div class="row" bind:this={measurer}>
      {#each ordered as space (space.id)}
        <span class="tab" class:with-menu={space.id === selected?.id} data-id={space.id}>{@render label(space)}</span>
      {/each}
      <span class="more" data-id={MORE}>{ordered.length} more ▾</span>
    </div>
  </div>
  <span
    class="indicator"
    class:animated
    style:width="{indicator.width}px"
    style:transform="translateX({indicator.left}px)"
  ></span>
  <div class="tablist" role="tablist">
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
          class:with-menu={space.id === selected?.id}
          onclick={() => onselect(space.id)}
          onmouseenter={(event) => showCutName(event, space)}
          animate:flip={{ duration: FLIP_MS }}
        >
          {@render label(space)}
        </button>
      {/each}
    </div>
    {#if unsorted && shown.has(unsorted.id)}
      <button class="tab" role="tab" aria-selected={unsorted.id === activeId} onclick={() => onselect(unsorted.id)}>
        {@render label(unsorted)}
      </button>
    {/if}
  </div>
  {#if hidden.length > 0}
    <Menu
      label="{hidden.length} more spaces"
      text="{hidden.length} more ▾"
      items={hidden.map((space) => ({ label: joinEmoji(space.emoji, space.name), onselect: () => onselect(space.id) }))}
    />
  {/if}
  <!-- Outside the tab list, so the list holds only tabs and each tab stays one element that can
       be dragged. It sits over the end of the selected tab, which leaves room for it, and slides
       along with the pill. -->
  {#if selected}
    <div class="tab-menu" class:animated style:transform="translateX({indicator.left + indicator.width}px)">
      <Menu
        label="Actions for space {selected.name}"
        align="left"
        items={[
          { label: 'Rename', onselect: () => onrename(selectedTab()) },
          { label: 'Delete', onselect: () => ondelete(selectedTab()), danger: true },
        ]}
      />
    </div>
  {/if}
</div>

{#snippet label(space: Space)}
  {#if space.emoji}<span class="emoji">{space.emoji}</span>{/if}
  <span class="name">{space.name}</span>
{/snippet}

<style>
  .track {
    position: relative;
    display: flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
  }
  /* No size of its own, so the row inside doesn't widen the page. */
  .measurer {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
    visibility: hidden;
  }
  .row {
    display: flex;
    width: max-content;
  }
  .more {
    padding: 0 10px;
    font-weight: 500;
    white-space: nowrap;
  }
  .tablist,
  .tabs {
    display: flex;
    gap: 2px;
  }
  .indicator {
    position: absolute;
    top: 3px;
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
      width 0.25s cubic-bezier(0.3, 0.7, 0.4, 1);
  }
  .tab {
    position: relative;
    display: flex;
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
  .tab.with-menu {
    padding-right: 34px;
  }
  /* Its right edge lines up with the pill's, less the room left for it in the tab. */
  .tab-menu {
    position: absolute;
    top: 7px;
    left: -28px;
  }
  .tab-menu.animated {
    transition: transform 0.25s cubic-bezier(0.3, 0.7, 0.4, 1);
  }
  .tab:hover,
  .tab[aria-selected='true'] {
    color: var(--fg);
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
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
