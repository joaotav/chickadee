<script lang="ts">
  // PROTOTYPE for #48. A line that shrinks while a message counts down. The animation is the
  // timer: the message closes when it ends, and pausing it pauses the countdown too.
  let {
    shape,
    duration,
    paused,
    ondone,
    radius = 0,
    inset = 0,
    hidden = false,
  }: {
    /** An outline around the parent, or a bar along its bottom edge. */
    shape: 'outline' | 'bar';
    duration: number;
    paused: boolean;
    ondone: () => void;
    radius?: number;
    /** How far inside the parent's edges the outline sits. Negative goes outside. */
    inset?: number;
    /** Counts down without showing the line. */
    hidden?: boolean;
  } = $props();
</script>

{#if shape === 'bar'}
  <span class="countdown bar" class:paused class:hidden style:animation-duration="{duration}ms" onanimationend={ondone}
  ></span>
{:else}
  <svg
    class="countdown outline"
    class:hidden
    style:inset="{inset}px"
    style:width="calc(100% - {2 * inset}px)"
    style:height="calc(100% - {2 * inset}px)"
    aria-hidden="true"
  >
    <rect class:paused rx={radius} pathLength="100" style:animation-duration="{duration}ms" onanimationend={ondone} />
  </svg>
{/if}

<style>
  .countdown {
    position: absolute;
    pointer-events: none;
  }
  .hidden {
    opacity: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .countdown {
      opacity: 0;
    }
  }
  .bar {
    bottom: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: var(--accent);
    transform-origin: left;
    animation: drain linear forwards;
  }
  @keyframes drain {
    to {
      transform: scaleX(0);
    }
  }
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
  @keyframes shrink {
    to {
      stroke-dashoffset: 100;
    }
  }
  .paused {
    animation-play-state: paused;
  }
</style>
