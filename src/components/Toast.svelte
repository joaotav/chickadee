<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import Countdown from '@/components/Countdown.svelte';
  import { proto } from '@/lib/prototype.svelte';

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

  const DURATION = 10000;

  // A quick rise in and fade out, or none with the system's "reduce motion" setting.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The countdown pauses once the pointer moves over the toast, not when the toast merely
  // appears under a pointer that's standing still.
  let paused = $state(false);
</script>

<div
  class="toast"
  role="status"
  in:fly|global={{ y: 8, duration: still ? 0 : 200 }}
  out:fade|global={{ duration: still ? 0 : 150 }}
  onpointermove={() => (paused = true)}
  onpointerleave={() => (paused = false)}
>
  <span class="message">{message}</span>
  <span class="action">
    {#if onundo}
      <button onclick={onundo}>Undo</button>
    {:else}
      <button onclick={ondismiss}>OK</button>
    {/if}
    {#if proto.countdown === 'c'}
      <Countdown shape="outline" radius={8} inset={-3} duration={DURATION} {paused} ondone={ondismiss} />
    {/if}
  </span>
  {#if proto.countdown !== 'c'}
    <Countdown
      shape={proto.countdown === 'b' ? 'bar' : 'outline'}
      radius={10}
      hidden={proto.countdown === 'd'}
      duration={DURATION}
      {paused}
      ondone={ondismiss}
    />
  {/if}
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
    max-width: calc(100vw - 32px);
    padding: 10px 10px 10px 16px;
    overflow: hidden;
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
  .action {
    position: relative;
    flex: none;
    display: flex;
  }
  button {
    height: 28px;
    padding: 0 12px;
    border-radius: 6px;
    color: var(--accent);
    font-weight: 600;
  }
  button:hover {
    background: var(--row-hover);
  }
</style>
