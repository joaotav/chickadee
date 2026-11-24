<script lang="ts">
  import { outside } from '@/lib/outside';

  let {
    places,
  }: {
    /** The other places the link is saved in. */
    places: string[];
  } = $props();

  let open = $state(false);
  let button: HTMLButtonElement;
  const label = $derived(`Saved ${places.length + 1} times`);

  function onkeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') {
      open = false;
      button.focus();
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="duplicate-mark" class:open {@attach outside(() => (open = false))}>
  <button class="mark" title={label} aria-label={label} aria-expanded={open} bind:this={button} onclick={() => (open = !open)}>
    <!-- Lucide's "triangle-alert" icon, https://lucide.dev, ISC license. -->
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  </button>
  {#if open}
    <div class="places">
      <strong>Also saved in</strong>
      <ul>
        {#each places as place, i (i)}
          <li>{place}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .duplicate-mark {
    position: relative;
  }
  /* See-through, so it shows the row's own color. Its own highlight fades like the row's. */
  .mark {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 5px;
    color: var(--danger);
    transition: background 0.15s;
  }
  .mark:hover,
  .open .mark {
    background: var(--row-hover);
  }
  svg {
    width: 13px;
    height: 13px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .places {
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
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* One line each, cut short for long names. */
  li {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
