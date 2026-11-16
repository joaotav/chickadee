<script lang="ts">
  // PROTOTYPE for showing the search shortcuts (#31). Throwaway: it lives only on the
  // prototype/search-hints branch.
  import { proto, SEEN_LIMIT, VARIANTS, type Variant } from '@/lib/prototype.svelte';

  const keys = Object.keys(VARIANTS) as Variant[];

  function cycle(by: number) {
    proto.variant = keys[(keys.indexOf(proto.variant) + by + keys.length) % keys.length]!;
  }

  $effect(() => {
    localStorage.setItem('prototype:search-hints', proto.variant);
    localStorage.setItem('prototype:search-hints:mac', String(proto.mac));
    localStorage.setItem('prototype:search-hints:seen', String(proto.seen));
  });

  // Left and right cycle the variants, only while nothing has focus.
  function onkeydown(event: KeyboardEvent) {
    if (event.target !== document.body || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    cycle(event.key === 'ArrowLeft' ? -1 : 1);
    event.preventDefault();
  }
</script>

<svelte:window {onkeydown} />

<div class="switcher">
  <span class="tag">Prototype</span>
  <span class="label">Search hints</span>
  <button class="arrow" aria-label="Previous" onclick={() => cycle(-1)}>‹</button>
  <span class="value">{proto.variant.toUpperCase()} · {VARIANTS[proto.variant].name}</span>
  <button class="arrow" aria-label="Next" onclick={() => cycle(1)}>›</button>
  <span class="hint">{VARIANTS[proto.variant].hint}</span>
  <label><input type="checkbox" bind:checked={proto.mac} /> Mac keys</label>
  {#if proto.variant === 'c'}
    <span class="hint">Seen {Math.min(proto.seen, SEEN_LIMIT)}/{SEEN_LIMIT}</span>
    <button class="reset" onclick={() => (proto.seen = 0)}>Reset</button>
  {/if}
</div>

<style>
  .switcher {
    position: fixed;
    bottom: 80px;
    left: 50%;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: 2px solid #ffd60a;
    border-radius: 999px;
    background: #000;
    color: #fff;
    font: 12px/1.2 system-ui, sans-serif;
    box-shadow: 0 8px 24px #000a;
    transform: translateX(-50%);
    white-space: nowrap;
  }
  .tag {
    padding: 2px 8px;
    border-radius: 999px;
    background: #ffd60a;
    color: #000;
    font-weight: 700;
  }
  .label,
  .hint {
    margin-left: 6px;
    color: #aaa;
  }
  .value {
    min-width: 200px;
    text-align: center;
    font-weight: 600;
  }
  label {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
  }
  button {
    color: #fff;
  }
  button:hover {
    background: #555;
  }
  .arrow {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: 16px;
    line-height: 1;
  }
  .reset {
    padding: 2px 8px;
    border: 1px solid #555;
    border-radius: 999px;
  }
</style>
