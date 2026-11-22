<script lang="ts">
  import { untrack } from 'svelte';
  import { outside } from '@/lib/outside';
  import { proto } from '@/lib/prototype.svelte';
  import EmojiPicker from './EmojiPicker.svelte';
  import { splitEmoji } from '@/lib/tree';

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

  const EMOJI = [
    '💼', '🏠', '🔬', '🛠️', '📚', '🎓', '💡', '🎨', '🎵', '🎮',
    '📈', '💰', '🛒', '✈️', '🍳', '🏃', '❤️', '🌱', '📰', '🗂️',
    '📌', '⭐', '🔥', '🚀', '🧪', '💻', '📝', '📅', '🎬', '🌍',
  ];

  let chosen = $state(untrack(() => emoji));
  let text = $state(untrack(() => name));
  let custom = $state('');
  // PROTOTYPE (#64): whether the full picker is open, in variants B and C.
  let picking = $state(false);
  const QUICK = EMOJI.slice(0, 14);

  function pick(emoji: string) {
    chosen = emoji;
    picking = false;
  }

  const focus = (input: HTMLInputElement) => input.focus();

  // A press outside closes the form, unless the name or icon has changed, which it would lose.
  function closeIfUnchanged() {
    if (text === name && chosen === emoji) oncancel();
  }

  // Any emoji can be typed or pasted into the "Other" field. Only its first emoji is kept.
  function onCustomInput() {
    const typed = splitEmoji(custom.trim()).emoji;
    if (typed) chosen = typed;
    custom = '';
  }

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    // An emoji typed at the start of the name works too.
    const split = splitEmoji(text.trim());
    if (!split.name) return;
    onsave(split.emoji ?? chosen, split.name);
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      oncancel();
    }
  }
</script>

<!-- The listener catches Escape from the fields inside, which are interactive. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form class="space-form" aria-label={heading} {onsubmit} {onkeydown} {@attach outside(closeIfUnchanged)}>
  <h2>{heading}</h2>
  {#if proto.variant === 'b'}
    <div class="name-row">
      <button type="button" class="icon-button" aria-label="Icon" aria-expanded={picking} onclick={() => (picking = !picking)}>
        {chosen ?? '∅'}
      </button>
      <input class="name" bind:value={text} aria-label="Space name" placeholder="Name" {@attach focus} />
    </div>
    {#if picking}
      <EmojiPicker onpick={pick} />
      <button type="button" class="link" onclick={() => {
          chosen = null;
          picking = false;
        }}>No icon</button>
    {/if}
  {:else}
    <input class="name" bind:value={text} aria-label="Space name" placeholder="Name" {@attach focus} />
  {/if}
  {#if proto.variant === 'a'}
    <fieldset>
      <legend>Icon</legend>
      <div class="current">
        <span class="preview">{chosen ?? '∅'}</span>
        <span>{chosen ? 'Picked' : 'No icon'}</span>
        {#if chosen}<button type="button" class="link" onclick={() => (chosen = null)}>No icon</button>{/if}
      </div>
      <EmojiPicker onpick={(emoji) => (chosen = emoji)} />
    </fieldset>
  {:else if proto.variant === 'c'}
    <fieldset>
      <legend>Icon</legend>
      <div class="grid">
        <label class="none" title="No icon">
          <input type="radio" name="emoji" checked={chosen === null} onchange={() => (chosen = null)} />
          <span aria-hidden="true">∅</span><span class="visually-hidden">No icon</span>
        </label>
        {#each QUICK as option (option)}
          <label>
            <input type="radio" name="emoji" checked={chosen === option} onchange={() => (chosen = option)} />
            {option}
          </label>
        {/each}
        {#if chosen !== null && !QUICK.includes(chosen)}
          <label>
            <input type="radio" name="emoji" checked onchange={() => {}} />
            {chosen}
          </label>
        {/if}
        <button type="button" class="more" aria-expanded={picking} onclick={() => (picking = !picking)} title="More emoji">More…</button>
      </div>
      {#if picking}<EmojiPicker onpick={pick} />{/if}
    </fieldset>
  {/if}
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
  .name,
  .custom {
    width: 100%;
    height: 30px;
    padding: 0 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
    outline: none;
    background: var(--bg);
    color: var(--fg);
    font: inherit;
  }
  .name:focus,
  .custom:focus {
    border-color: var(--accent);
  }
  fieldset {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    border: 0;
  }
  legend {
    margin-bottom: 6px;
    padding: 0;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .name-row {
    display: flex;
    gap: 6px;
  }
  .icon-button {
    flex: none;
    width: 30px;
    height: 30px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg);
    font-size: 16px;
  }
  .icon-button:hover,
  .icon-button[aria-expanded='true'] {
    border-color: var(--accent);
  }
  .link {
    align-self: flex-start;
    color: var(--accent);
    font-size: 12px;
  }
  .link:hover {
    text-decoration: underline;
  }
  .current {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
  }
  .current .link {
    margin-left: auto;
  }
  .preview {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--row);
    color: var(--fg);
    font-size: 17px;
  }
  .more {
    grid-column: span 2;
    height: 32px;
    border-radius: 6px;
    color: var(--accent);
    font-size: 12px;
  }
  .more:hover,
  .more[aria-expanded='true'] {
    background: var(--row);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  }
  /* Each option is a square. The radio button is invisible and covers it, so it gets the clicks and the focus. */
  .grid label {
    position: relative;
    display: grid;
    place-items: center;
    height: 32px;
    border: 1px solid transparent;
    border-radius: 6px;
    font-size: 17px;
    cursor: pointer;
  }
  .grid label:hover {
    background: var(--row);
  }
  .grid label:has(:checked) {
    border-color: var(--accent);
    background: var(--row);
  }
  .grid label:has(:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .grid input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
  .none {
    color: var(--muted);
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
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
