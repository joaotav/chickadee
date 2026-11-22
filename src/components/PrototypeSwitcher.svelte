<script lang="ts">
  // PROTOTYPE for picking a space's icon from every emoji (#64). Throwaway: it lives only on the
  // prototype/emoji-picker branch.
  import { proto, VARIANTS, type Variant } from '@/lib/prototype.svelte';

  const keys = Object.keys(VARIANTS) as Variant[];

  function cycle(by: number) {
    proto.variant = keys[(keys.indexOf(proto.variant) + by + keys.length) % keys.length]!;
  }

  $effect(() => {
    localStorage.setItem('prototype:emoji-picker', proto.variant);
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
  <span class="label">Space icon</span>
  <button class="arrow" aria-label="Previous" onclick={() => cycle(-1)}>‹</button>
  <span class="value">{proto.variant.toUpperCase()} · {VARIANTS[proto.variant].name}</span>
  <button class="arrow" aria-label="Next" onclick={() => cycle(1)}>›</button>
  <span class="hint">{VARIANTS[proto.variant].hint}</span>
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
</style>
