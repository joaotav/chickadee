<script lang="ts">
  import { outside } from '@/lib/outside';
  import { joinEmoji, type Space } from '@/lib/tree';

  let { space, ondelete, oncancel }: { space: Space; ondelete: () => void; oncancel: () => void } = $props();

  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

  // Names what goes with the space, leaving out a count of zero.
  const question = $derived.by(() => {
    const name = `“${joinEmoji(space.emoji, space.name)}”`;
    const bookmarks = space.unsorted.length + space.categories.reduce((sum, category) => sum + category.links.length, 0);
    const links = plural(bookmarks, 'bookmark', 'bookmarks');
    if (space.categories.length === 0) return `Delete space ${name} and its ${links}?`;
    const categories = plural(space.categories.length, 'category', 'categories');
    return `Delete space ${name} and its ${categories}${bookmarks > 0 ? ` (${links})` : ''}?`;
  });

  // Cancel has focus, so pressing Enter by accident doesn't delete.
  const focus = (button: HTMLButtonElement) => button.focus();
</script>

<!-- The listener catches Escape from the buttons inside, which are interactive. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="question"
  role="group"
  aria-labelledby="delete-space-question"
  {@attach outside(oncancel)}
  onkeydown={(event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      oncancel();
    }
  }}
>
  <p id="delete-space-question">{question}</p>
  <div class="buttons">
    <button class="danger" onclick={ondelete}>Delete</button>
    <button onclick={oncancel} {@attach focus}>Cancel</button>
  </div>
</div>

<style>
  .question {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: max-content;
    max-width: min(440px, calc(100vw - 32px));
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    box-shadow: 0 12px 32px #0006;
  }
  p {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
  button {
    height: 28px;
    padding: 0 12px;
    border-radius: 6px;
    color: var(--muted);
  }
  button:hover {
    background: var(--row-hover);
    color: var(--fg);
  }
  .danger {
    background: var(--danger-fill);
    color: var(--bg);
    font-weight: 600;
  }
  .danger:hover {
    background: var(--danger-fill);
    color: var(--bg);
    filter: brightness(1.1);
  }
</style>
