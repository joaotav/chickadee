<script lang="ts">
  // PROTOTYPE for #48. Throwaway: it lives only on the prototype/messages branch.
  import { proto, VARIANTS, type Variant } from '@/lib/prototype.svelte';

  let { onshow }: { onshow: (kind: 'undo' | 'error') => void } = $props();

  const keys = Object.keys(VARIANTS) as Variant[];
  let showPopup = $state(false);

  function cycle(by: number) {
    proto.countdown = keys[(keys.indexOf(proto.countdown) + by + keys.length) % keys.length]!;
  }

  $effect(() => localStorage.setItem('prototype:countdown', proto.countdown));

  // Left and right cycle the variants, only while nothing has focus.
  function onkeydown(event: KeyboardEvent) {
    if (event.target !== document.body || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    cycle(event.key === 'ArrowLeft' ? -1 : 1);
    event.preventDefault();
  }

  // The popup preview asks to be closed when its countdown ends or OK is clicked.
  function onmessage(event: MessageEvent) {
    if (event.origin === location.origin && event.data === 'prototype:close') showPopup = false;
  }

  // Sizes the preview to the popup's content, as the browser does for the real one.
  function fit(event: Event) {
    const frame = event.currentTarget as HTMLIFrameElement;
    frame.style.height = `${frame.contentDocument!.documentElement.scrollHeight}px`;
  }
</script>

<svelte:window {onkeydown} {onmessage} />

{#if showPopup}
  <iframe class="popup" src="/popup.html?demo" title="Popup preview" onload={fit}></iframe>
{/if}

<div class="switcher">
  <span class="tag">Prototype</span>
  <span class="label">Countdown (#48)</span>
  <button class="arrow" aria-label="Previous" onclick={() => cycle(-1)}>‹</button>
  <span class="value">{proto.countdown.toUpperCase()} · {VARIANTS[proto.countdown]}</span>
  <button class="arrow" aria-label="Next" onclick={() => cycle(1)}>›</button>
  <span class="label">Show</span>
  <button class="show" onclick={() => onshow('undo')}>Undo toast</button>
  <button class="show" onclick={() => onshow('error')}>Error toast</button>
  <button class="show" onclick={() => (showPopup = !showPopup)}>{showPopup ? 'Hide popup' : 'Popup'}</button>
</div>

<style>
  /* Content-box, so the border doesn't take room from the popup inside. */
  .popup {
    box-sizing: content-box;
    position: fixed;
    top: 60px;
    right: 16px;
    z-index: 100;
    width: 320px;
    height: 120px;
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 12px 32px #0008;
  }
  .switcher {
    position: fixed;
    top: 60px;
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
  .label {
    margin-left: 6px;
    color: #aaa;
  }
  .value {
    min-width: 170px;
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
  .show {
    height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    background: #333;
  }
</style>
