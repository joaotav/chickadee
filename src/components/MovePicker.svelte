<script lang="ts" module>
  /** Places to move something to, in groups like the spaces, each with an optional heading. */
  export interface PlaceGroup {
    label?: string;
    places: { id: string; label: string }[];
  }
</script>

<script lang="ts">
  // PROTOTYPE for #59: variants B (dropdown) and C (searchable list).
  import { outside } from '@/lib/outside';
  import { proto } from '@/lib/prototype.svelte';

  let {
    heading,
    groups,
    onmove,
    oncancel,
  }: {
    heading: string;
    groups: PlaceGroup[];
    onmove: (id: string) => void;
    oncancel: () => void;
  } = $props();

  const focus = (element: HTMLElement) => element.focus();

  // B
  let picked = $state(groups[0]?.places[0]?.id ?? '');

  // C
  let filter = $state('');
  let selected = $state(0);
  const shown = $derived(
    groups
      .map((group) => {
        const query = filter.trim().toLowerCase();
        const groupMatches = !!group.label && group.label.toLowerCase().includes(query);
        return { ...group, places: group.places.filter((place) => groupMatches || place.label.toLowerCase().includes(query)) };
      })
      .filter((group) => group.places.length > 0),
  );
  const flat = $derived(shown.flatMap((group) => group.places));

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      oncancel();
    } else if (proto.variant === 'c' && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      if (flat.length) selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length;
    } else if (proto.variant === 'c' && event.key === 'Enter' && flat[selected]) {
      event.preventDefault();
      onmove(flat[selected]!.id);
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="picker" role="group" aria-label={heading} {@attach outside(oncancel)} {onkeydown}>
  <span class="heading">{heading}</span>
  {#if proto.variant === 'b'}
    <select aria-label="Place" bind:value={picked} {@attach focus}>
      {#each groups as group, i (i)}
        {#if group.label}
          <optgroup label={group.label}>
            {#each group.places as place (place.id)}<option value={place.id}>{place.label}</option>{/each}
          </optgroup>
        {:else}
          {#each group.places as place (place.id)}<option value={place.id}>{place.label}</option>{/each}
        {/if}
      {/each}
    </select>
    <div class="buttons">
      <button onclick={oncancel}>Cancel</button>
      <button class="primary" onclick={() => onmove(picked)}>Move</button>
    </div>
  {:else}
    <input type="text" placeholder="Search" aria-label="Search places" bind:value={filter} oninput={() => (selected = 0)} {@attach focus} />
    <ul>
      {#each shown as group, g (g)}
        {#if group.label}<li class="group">{group.label}</li>{/if}
        {#each group.places as place (place.id)}
          {@const index = flat.indexOf(place)}
          <li>
            <button class:selected={index === selected} onmousemove={() => (selected = index)} onclick={() => onmove(place.id)}>
              {place.label}
            </button>
          </li>
        {/each}
      {:else}
        <li class="none">No matches</li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .picker {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
    padding: 8px;
    border: 1px solid var(--accent);
    border-radius: 8px;
    background: var(--card);
  }
  .heading {
    color: var(--muted);
    font-size: 12px;
  }
  select,
  input {
    width: 100%;
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
    outline: none;
    background: var(--bg);
    color: var(--fg);
    font: inherit;
  }
  select:focus,
  input:focus {
    border-color: var(--accent);
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
  .buttons button {
    height: 26px;
    padding: 0 10px;
    border-radius: 6px;
    color: var(--muted);
  }
  .buttons button:hover {
    background: var(--row-hover);
    color: var(--fg);
  }
  .buttons .primary {
    background: var(--accent-fill);
    color: var(--bg);
    font-weight: 600;
  }
  ul {
    max-height: 200px;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }
  .group {
    padding: 6px 8px 2px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
  }
  ul button {
    width: 100%;
    padding: 5px 8px;
    border-radius: 5px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  ul button.selected {
    background: var(--row-hover);
  }
  .none {
    padding: 6px 8px;
    color: var(--muted);
  }
</style>
