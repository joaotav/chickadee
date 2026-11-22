<script lang="ts">
  import { untrack } from 'svelte';
  import { sessionName } from '@/lib/session';
  import { joinEmoji, sameName, UNSORTED, type Space } from '@/lib/tree';

  let {
    spaces,
    spaceId,
    count,
    onsave,
    oncancel,
  }: {
    /** The spaces the session can go in. */
    spaces: Space[];
    /** The space picked at first. */
    spaceId?: string;
    /** How many tabs will be saved, when known. Before the `tabs` permission, it isn't. */
    count: number | null;
    onsave: (spaceId: string, name: string) => void;
    oncancel: () => void;
  } = $props();

  let name = $state(sessionName());
  let picked = $state(untrack(() => (spaces.some((space) => space.id === spaceId) ? spaceId! : spaces[0]!.id)));

  const select = (input: HTMLInputElement) => input.select();

  // A category already in the picked space with the typed name. Unsorted counts while the
  // space has loose links, as on the new tab page.
  const space = $derived(spaces.find((space) => space.id === picked)!);
  const clash = $derived.by(() => {
    const typed = name.trim();
    const taken = [...(space.unsorted.length > 0 ? [UNSORTED] : []), ...space.categories.map((category) => category.title)];
    return typed ? taken.find((other) => sameName(other, typed)) : undefined;
  });

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    if (clash) return;
    // Called straight from the submit, which the permission request needs.
    onsave(picked, name.trim() || sessionName());
  }
</script>

<form {onsubmit} aria-label="Save all tabs">
  <p class="note">
    {#if count === null}
      Saves the web pages open in this window as a new category, leaving out pinned tabs.
    {:else}
      Saves the {count} web {count === 1 ? 'page' : 'pages'} open in this window as a new category, leaving out pinned tabs.
    {/if}
  </p>
  <label>
    <span>Name</span>
    <input bind:value={name} aria-invalid={clash !== undefined} {@attach select} />
  </label>
  <label>
    <span>Space</span>
    <select bind:value={picked} aria-label="Space">
      {#each spaces as space (space.id)}
        <option value={space.id}>{joinEmoji(space.emoji, space.name)}</option>
      {/each}
    </select>
  </label>
  {#if clash !== undefined}
    <p class="message" role="alert">There's already a category called “{clash}” in <span class="space">{joinEmoji(space.emoji, space.name)}</span></p>
  {/if}
  <div class="buttons">
    <button type="button" onclick={oncancel}>Cancel</button>
    <button type="submit" class="primary" disabled={clash !== undefined}>{count === null ? 'Save tabs' : `Save ${count} ${count === 1 ? 'tab' : 'tabs'}`}</button>
  </div>
</form>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .note {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  label span {
    color: var(--muted);
    font-size: 12px;
  }
  input,
  select {
    height: 30px;
    padding: 0 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
    outline: none;
    background: var(--bg);
    color: var(--fg);
    font: inherit;
  }
  input:focus,
  select:focus {
    border-color: var(--accent);
  }
  .message {
    margin: 0;
    color: var(--danger);
    font-size: 12px;
  }
  .message .space {
    white-space: nowrap;
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 2px;
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
