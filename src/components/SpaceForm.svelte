<script lang="ts">
  import { untrack } from 'svelte';
  import { outside } from '@/lib/outside';
  import { splitEmoji } from '@/lib/tree';
  import EmojiPicker from './EmojiPicker.svelte';

  let {
    heading,
    emoji = null,
    name = '',
    onsave,
    oncancel,
  }: {
    heading: string;
    emoji?: string | null;
    name?: string;
    onsave: (emoji: string | null, name: string) => void;
    oncancel: () => void;
  } = $props();

  let chosen = $state(untrack(() => emoji));
  let text = $state(untrack(() => name));
  let picking = $state(false);

  const focus = (input: HTMLInputElement) => input.focus();

  // A press outside closes the form, unless the name or icon has changed, which it would lose.
  function closeIfUnchanged() {
    if (text === name && chosen === emoji) oncancel();
  }

  function pick(emoji: string | null) {
    chosen = emoji;
    picking = false;
  }

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    // An emoji typed at the start of the name works too.
    const split = splitEmoji(text.trim());
    if (!split.name) return;
    onsave(split.emoji ?? chosen, split.name);
  }

  // Escape closes the picker if it's open, and otherwise the form.
  function onkeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    if (picking) picking = false;
    else oncancel();
  }
</script>

<!-- The listener catches Escape from the fields inside, which are interactive. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form class="space-form" aria-label={heading} {onsubmit} {onkeydown} {@attach outside(closeIfUnchanged)}>
  <h2>{heading}</h2>
  <!-- The icon button and the name share one field. The picker opens over the form under it. -->
  <div class="field-wrap" {@attach outside(() => (picking = false))}>
    <div class="field">
      <button
        type="button"
        class="icon"
        aria-label={chosen ? `Icon ${chosen}` : 'Icon'}
        aria-expanded={picking}
        onclick={() => (picking = !picking)}
      >
        {#if chosen}
          {chosen}
        {:else}
          <!-- A plain smiley: no icon yet. -->
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6.2" />
            <path d="M5.6 9.6c.6.9 1.4 1.3 2.4 1.3s1.8-.4 2.4-1.3" />
            <circle class="eye" cx="6" cy="6.6" r=".5" />
            <circle class="eye" cx="10" cy="6.6" r=".5" />
          </svg>
        {/if}
      </button>
      <input bind:value={text} aria-label="Space name" placeholder="Name" {@attach focus} />
    </div>
    {#if picking}
      <div class="popover">
        <EmojiPicker onpick={pick} />
      </div>
    {/if}
  </div>
  <div class="buttons">
    <button type="button" onclick={oncancel}>Cancel</button>
    <button type="submit" class="primary" disabled={!splitEmoji(text.trim()).name}>Save</button>
  </div>
</form>

<style>
  .space-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 320px;
    padding: 14px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    box-shadow: 0 12px 32px #0006;
  }
  h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
  }
  .field-wrap {
    position: relative;
  }
  .field {
    display: flex;
    height: 32px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg);
  }
  .field:focus-within {
    border-color: var(--accent);
  }
  .icon {
    display: grid;
    flex: none;
    place-items: center;
    width: 34px;
    border-right: 1px solid var(--border);
    border-radius: 5px 0 0 5px;
    color: var(--muted);
    font-size: 16px;
  }
  .icon:hover,
  .icon[aria-expanded='true'] {
    background: var(--row);
    color: var(--accent);
  }
  .icon svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.3;
    stroke-linecap: round;
  }
  .icon .eye {
    fill: currentColor;
  }
  input {
    flex: 1;
    min-width: 0;
    padding: 0 10px;
    border: 0;
    outline: none;
    background: none;
    color: var(--fg);
    font: inherit;
  }
  .popover {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    left: 0;
    z-index: 5;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    box-shadow: 0 12px 32px #0008;
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
  .buttons button {
    height: 30px;
    padding: 0 14px;
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
  .buttons .primary:hover {
    background: var(--accent-fill);
    color: var(--bg);
    filter: brightness(1.1);
  }
  .buttons .primary:disabled {
    opacity: 0.5;
    cursor: default;
    filter: none;
  }
</style>
