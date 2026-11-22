<script lang="ts">
  import { outside } from '@/lib/outside';

  let { oncreate }: { oncreate: (title: string) => void } = $props();

  let open = $state(false);
  let name = $state('');

  const focus = (input: HTMLInputElement) => input.focus();

  function close() {
    open = false;
    name = '';
  }

  // A press outside closes the form, unless a name has been typed, which it would lose.
  function closeIfEmpty() {
    if (name === '') close();
  }

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    oncreate(name.trim());
    close();
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  }
</script>

<div class="new-category">
  {#if open}
    <!-- The listener catches Escape from the fields inside, which are interactive. -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <form {onsubmit} {onkeydown} {@attach outside(closeIfEmpty)}>
      <input bind:value={name} aria-label="Category name" placeholder="Name" {@attach focus} />
      <div class="buttons">
        <button type="button" onclick={close}>Cancel</button>
        <button type="submit" class="primary" disabled={!name.trim()}>Add</button>
      </div>
    </form>
  {:else}
    <button class="open" onclick={() => (open = true)}>+ New category</button>
  {/if}
</div>

<style>
  .new-category {
    display: flex;
    width: var(--card-width);
    padding: var(--card-padding);
    border: 1px dashed var(--border);
    border-radius: 10px;
  }
  .open {
    width: 100%;
    padding: 2px 4px;
    color: var(--muted);
    font-weight: 600;
    text-align: left;
  }
  .open:hover {
    color: var(--fg);
  }
  /* The same form as + Add bookmark. */
  form {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }
  input {
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
  input:focus {
    border-color: var(--accent);
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
  .buttons button {
    height: 28px;
    padding: 0 12px;
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
