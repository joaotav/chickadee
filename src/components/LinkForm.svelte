<script lang="ts">
  import { untrack } from 'svelte';
  import { outside } from '@/lib/outside';
  import { toWebUrl } from '@/lib/tree';

  let {
    url = '',
    title = '',
    submit,
    onsave,
    oncancel,
  }: {
    /** The link's address and title when editing one, empty when adding. */
    url?: string;
    title?: string;
    /** The submit button's label, like "Add". */
    submit: string;
    /** Receives the normalized address and the trimmed title, which may be empty. */
    onsave: (url: string, title: string) => void;
    oncancel: () => void;
  } = $props();

  let urlText = $state(untrack(() => url));
  let titleText = $state(untrack(() => title));
  let message = $state<string | null>(null);

  const focus = (input: HTMLInputElement) => input.focus();

  // A press outside closes the form, unless something has been typed, which it would lose.
  function closeIfUnchanged() {
    if (urlText === url && titleText === title) oncancel();
  }

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    // An address left as it was stays, even one this page can't open, like a bookmarklet's.
    const webUrl = url && urlText.trim() === url ? url : toWebUrl(urlText);
    if (!webUrl) {
      message = 'Enter a web address, like example.com';
      return;
    }
    onsave(webUrl, titleText.trim());
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
<form {onsubmit} {onkeydown} {@attach outside(closeIfUnchanged)}>
  <input
    bind:value={urlText}
    aria-label="URL"
    placeholder="URL"
    aria-invalid={message !== null}
    oninput={() => (message = null)}
    {@attach focus}
  />
  <input bind:value={titleText} aria-label="Title" placeholder="Title (optional)" />
  {#if message}<p class="message" role="alert">{message}</p>{/if}
  <div class="buttons">
    <button type="button" onclick={oncancel}>Cancel</button>
    <button type="submit" class="primary">{submit}</button>
  </div>
</form>

<style>
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
  .message {
    margin: 0;
    color: var(--danger);
    font-size: 11px;
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
</style>
