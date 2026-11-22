<script lang="ts">
  import { onMount } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { fade, fly } from 'svelte/transition';
  import { countdown } from '@/lib/countdown';

  let {
    message,
    onundo,
    ondismiss,
  }: {
    message: string;
    /** Without it, the toast shows OK instead of Undo. */
    onundo?: () => void;
    ondismiss: () => void;
  } = $props();

  const DURATION = 10_000;

  // Only a toast whose time runs out fades away. Clicking a button, or a newer toast taking
  // its place, removes it at once.
  let timedOut = $state(false);
  const timer = countdown(DURATION, () => {
    timedOut = true;
    ondismiss();
  });
  onMount(() => timer.stop);

  // The countdown pauses once the pointer moves over the toast, not when the toast just
  // appears under a pointer that's standing still.
  let paused = $state(false);
  $effect(() => {
    if (paused) timer.pause();
    else timer.resume();
  });
</script>

<!-- Global transitions, so they also play when the page adds or removes the toast. -->
<div
  class="toast"
  role="status"
  in:fly|global={{ y: 8, duration: prefersReducedMotion.current ? 0 : 200 }}
  out:fade|global={{ duration: timedOut && !prefersReducedMotion.current ? 150 : 0 }}
  onpointermove={() => (paused = true)}
  onpointerleave={() => (paused = false)}
>
  <span class="message" title={message}>{message}</span>
  {#if onundo}
    <button onclick={onundo}>Undo</button>
  {:else}
    <button onclick={ondismiss}>OK</button>
  {/if}
  <!-- A line around the toast that shrinks as its time runs out. -->
  <svg class="countdown" aria-hidden="true">
    <rect class:paused rx="10" pathLength="100" style:animation-duration="{DURATION}ms" />
  </svg>
</div>

<style>
  .toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 16px;
    /* A long name is cut short instead of widening the message across the page. */
    max-width: min(480px, 100vw - 32px);
    padding: 10px 10px 10px 16px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    box-shadow: 0 12px 32px #0006;
    transform: translateX(-50%);
  }
  .message {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  button {
    flex: none;
    height: 28px;
    padding: 0 12px;
    border-radius: 6px;
    color: var(--accent);
    font-weight: 600;
  }
  button:hover {
    background: var(--row-hover);
  }
  .countdown {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .countdown {
      display: none;
    }
  }
  /* pathLength makes the outline 100 long, so one dash covers it and the offset hides it bit by bit. */
  rect {
    x: 1px;
    y: 1px;
    width: calc(100% - 2px);
    height: calc(100% - 2px);
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    stroke-dasharray: 100;
    animation: shrink linear forwards;
  }
  .paused {
    animation-play-state: paused;
  }
  @keyframes shrink {
    to {
      stroke-dashoffset: 100;
    }
  }
</style>
