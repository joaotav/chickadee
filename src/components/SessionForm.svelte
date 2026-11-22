<script lang="ts">
  import { untrack } from 'svelte';
  import { sessionName } from '@/lib/session';
  import { joinEmoji, type Space } from '@/lib/tree';

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

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();
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
    <input bind:value={name} {@attach select} />
  </label>
  <label>
    <span>Space</span>
    <select bind:value={picked} aria-label="Space">
      {#each spaces as space (space.id)}
        <option value={space.id}>{joinEmoji(space.emoji, space.name)}</option>
      {/each}
    </select>
  </label>
  <div class="buttons">
    <button type="button" onclick={oncancel}>Cancel</button>
    <button type="submit" class="primary">{count === null ? 'Save tabs' : `Save ${count} ${count === 1 ? 'tab' : 'tabs'}`}</button>
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
</style>
