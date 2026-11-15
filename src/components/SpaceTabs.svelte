<script lang="ts">
  import { onMount } from 'svelte';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import InlineInput from '@/components/InlineInput.svelte';
  import Menu from '@/components/Menu.svelte';
  import { proto } from '@/lib/prototype.svelte';
  import { joinEmoji, type Space } from '@/lib/tree';

  let {
    spaces,
    activeId,
    unsortedId,
    onselect,
    onmove,
    onaction,
    onrename,
  }: {
    spaces: Space[];
    activeId: string | undefined;
    /** The "Unsorted" tab isn't a folder of its own, so it stays last and can't be moved. */
    unsortedId: string | undefined;
    onselect: (id: string) => void;
    /** A space dropped before `before`, or at the end without it. */
    onmove: (id: string, before: string | undefined) => void;
    /** PROTOTYPE: Rename or Delete for a space, with the tab to show the form or question under. */
    onaction?: (kind: 'rename' | 'delete', id: string, tab: HTMLElement) => void;
    /** PROTOTYPE: a rename typed in the tab itself, emoji included. */
    onrename?: (id: string, title: string) => void;
  } = $props();

  // PROTOTYPE for #25 and #50: the ways to reach Rename and Delete.
  const tabOf = (id: string) => track.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
  const act = (kind: 'rename' | 'delete', id: string) => onaction?.(kind, id, tabOf(id));
  const actions = (space: Space) => [
    { label: 'Rename', onselect: () => act('rename', space.id) },
    { label: 'Delete', onselect: () => act('delete', space.id), danger: true },
  ];
  const menuInTab = $derived(proto.variant === 'a' || proto.variant === 'c' || proto.variant === 'e');

  // B: a right-click menu, at the pointer, or under the tab when opened from the keyboard.
  let context = $state<{ id: string; x: number; y: number } | null>(null);
  let contextEl = $state<HTMLElement>();
  function openContext(event: MouseEvent, space: Space) {
    if (proto.variant !== 'b') return;
    event.preventDefault();
    const rect = tabOf(space.id).getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    context = inside ? { id: space.id, x: event.clientX, y: event.clientY } : { id: space.id, x: rect.left, y: rect.bottom + 4 };
  }
  function closeContext(refocus: boolean) {
    if (refocus && context) tabOf(context.id).querySelector<HTMLElement>('.tab')?.focus();
    context = null;
  }

  // C: renaming in the tab itself, by double-click or F2.
  let editingId = $state<string | null>(null);
  function startEditing(space: Space) {
    if (proto.variant === 'c') editingId = space.id;
  }

  // Follows the dragged tab around, until the move is saved and the spaces come back from
  // the browser.
  let movable = $derived(spaces.filter((space) => space.id !== unsortedId));
  const unsorted = $derived(spaces.find((space) => space.id === unsortedId));
  const FLIP_MS = 150;

  function drop({ detail }: CustomEvent<DndEvent<Space>>) {
    movable = detail.items;
    const ids = movable.map((space) => space.id);
    const before = spaces.filter((space) => space.id !== unsortedId).map((space) => space.id);
    if (ids.join() !== before.join()) onmove(detail.info.id, ids[ids.indexOf(detail.info.id) + 1]);
  }

  let track: HTMLElement;
  let indicator = $state({ left: 0, width: 0 });
  // Off for the first measurement, so the pill appears in place instead of sliding in from the left.
  let animated = $state(false);

  function measure() {
    const tab = track?.querySelector<HTMLElement>('.selected');
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
    void proto.variant;
    void editingId;
    measure();
  });

  onMount(() => {
    // Emoji fonts can load after the first measurement and change tab widths.
    void document.fonts.ready.then(measure);
    addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  });
</script>

<svelte:window
  onpointerdown={(event) => context && !contextEl?.contains(event.target as Node) && closeContext(false)}
  onkeydown={(event) => context && event.key === 'Escape' && closeContext(true)}
/>

<div class="track" role="tablist" bind:this={track}>
  <span
    class="indicator"
    class:animated
    style:width="{indicator.width}px"
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
      dragDisabled: editingId !== null,
    }}
    onconsider={({ detail }) => (movable = detail.items)}
    onfinalize={drop}
  >
    {#each movable as space (space.id)}
      <div class="wrap" class:selected={space.id === activeId} data-id={space.id} animate:flip={{ duration: FLIP_MS }}>
        {#if editingId === space.id}
          <span class="tab editing">
            <InlineInput
              value={joinEmoji(space.emoji, space.name)}
              label="Space name"
              onsave={(text) => {
                editingId = null;
                onrename?.(space.id, text);
              }}
              oncancel={() => (editingId = null)}
            />
          </span>
        {:else}
          <button
            class="tab"
            role="tab"
            aria-selected={space.id === activeId}
            onclick={() => onselect(space.id)}
            oncontextmenu={(event) => openContext(event, space)}
            ondblclick={() => startEditing(space)}
            onkeydown={(event) => event.key === 'F2' && startEditing(space)}
          >
            {@render label(space)}
          </button>
          <!-- E: every tab has the ⋯, but only the selected tab's shows, so tabs keep their width. -->
          {#if menuInTab && (space.id === activeId || proto.variant === 'e')}
            <Menu label="Actions for space {space.name}" align="left" items={actions(space)} />
          {/if}
        {/if}
      </div>
    {/each}
  </div>
  {#if unsorted}
    <div class="wrap" class:selected={unsorted.id === activeId}>
      <button class="tab" role="tab" aria-selected={unsorted.id === activeId} onclick={() => onselect(unsorted.id)}>
        {@render label(unsorted)}
      </button>
    </div>
  {/if}
</div>

{#if context}
  {@const space = spaces.find((space) => space.id === context?.id)}
  {#if space}
    <div class="context" style:left="{context.x}px" style:top="{context.y}px" role="menu" bind:this={contextEl}>
      {#each actions(space) as item, index (item.label)}
        <button
          role="menuitem"
          class:danger={item.danger}
          {@attach (button) => {
            if (index === 0) button.focus();
          }}
          onclick={() => {
            context = null;
            item.onselect();
          }}>{item.label}</button
        >
      {/each}
    </div>
  {/if}
{/if}

{#snippet label(space: Space)}
  {#if space.emoji}<span class="emoji">{space.emoji}</span>{/if}
  <span>{space.name}</span>
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
  .tab:hover,
  .tab[aria-selected='true'] {
    color: var(--fg);
  }
  /* The copy that follows the pointer is outside the track, away from the pill. */
  .wrap:global(#dnd-action-dragged-el) {
    border-radius: 7px;
    background: var(--row-hover);
    color: var(--fg);
  }
  .wrap {
    display: flex;
    align-items: center;
  }
  .wrap:has(:global(.menu)) .tab {
    padding-right: 6px;
  }
  .wrap :global(.menu) {
    margin-right: 6px;
  }
  .wrap:not(.selected) :global(.menu) {
    visibility: hidden;
  }
  .editing {
    width: 180px;
    padding: 0 1px;
  }
  .context {
    position: fixed;
    z-index: 20;
    display: flex;
    flex-direction: column;
    min-width: 140px;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    box-shadow: 0 8px 24px #0006;
  }
  .context button {
    padding: 6px 10px;
    border-radius: 5px;
    text-align: left;
  }
  .context button:hover,
  .context button:focus-visible {
    background: var(--row-hover);
    outline: none;
  }
  .context .danger {
    color: var(--danger);
  }
  .emoji {
    font-size: 14px;
    line-height: 1;
  }
</style>
