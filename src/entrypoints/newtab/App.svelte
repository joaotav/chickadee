<script lang="ts">
  import { onMount } from 'svelte';
  import { dragHandleZone, setKeyboardDragTrigger, type DndEvent } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import CategoryCard from '@/components/CategoryCard.svelte';
  import Menu from '@/components/Menu.svelte';
  import NewCategory from '@/components/NewCategory.svelte';
  import PrototypeSwitcher from '@/components/PrototypeSwitcher.svelte';
  import SearchBox from '@/components/SearchBox.svelte';
  import SettingsPanel from '@/components/SettingsPanel.svelte';
  import SpaceForm from '@/components/SpaceForm.svelte';
  import SpaceTabs from '@/components/SpaceTabs.svelte';
  import Toast from '@/components/Toast.svelte';
  import { create, getWorkspace, move, subscribe, update } from '@/lib/bookmarks';
  import { isFolder, type BookmarkNode } from '@/lib/node';
  import { getActiveSpaceId, getCollapsed, getIcons, setActiveSpaceId, setCollapsed, watchCollapsed, watchIcons } from '@/lib/meta';
  import { cacheSettings, getCachedSettings, getSettings, setSettings, watchSettings, type Settings } from '@/lib/settings';
  import { defaultTitle, joinEmoji, splitEmoji, toSpaces, UNSORTED, type Category, type Link, type Space } from '@/lib/tree';
  import { proto } from '@/lib/prototype.svelte';
  import { openInBackground } from '@/lib/tabs';
  import { remove, restore } from '@/lib/undo';

  let spaces = $state<Space[] | null>(null);
  let rootId = $state<string | undefined>();
  let spaceForm = $state<'new' | 'rename' | null>(null);
  // The toast after a delete holds what was deleted, so it can be undone. Only the most
  // recent delete can be.
  let toast = $state<{ message: string; deleted?: BookmarkNode } | null>(null);
  let activeId = $state<string | undefined>();
  let error = $state<string | null>(null);
  let collapsed = $state<string[]>([]);
  let settings = $state<Settings>(getCachedSettings());

  // Space picks up a grip or a space tab for moving with the arrow keys. Enter is left alone,
  // so it still selects a space tab.
  setKeyboardDragTrigger('space');

  // The stylesheets pick the theme, density, titles and sizing from data-* attributes on <html>.
  // The first run happens before the page is drawn, so it starts with the cached settings.
  $effect(() => {
    Object.assign(document.documentElement.dataset, settings);
    cacheSettings(settings);
  });

  // The remembered space, or the first one if it no longer exists.
  const active = $derived(spaces?.find((space) => space.id === activeId) ?? spaces?.[0]);

  // The cards shown in the active space. The "Unsorted" card uses the space's own ID.
  const cardIds = $derived(
    active ? [...(active.unsorted.length > 0 ? [active.id] : []), ...active.categories.map((category) => category.id)] : [],
  );

  async function load() {
    try {
      const [workspace, icons] = await Promise.all([getWorkspace(), getIcons()]);
      rootId = workspace.id;
      spaces = toSpaces(workspace, icons);
      error = null;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function select(id: string) {
    activeId = id;
    void setActiveSpaceId(id);
  }

  // The "Unsorted" tab holds links directly in Workspace. It isn't a folder of its own, so it
  // can't be renamed and has no categories.
  const isRealSpace = (space: Space) => space.id !== rootId;

  // The cards in the active space, in a list that dragging rearranges. Only categories can be
  // moved, the "Unsorted" card stays first and the new category button last.
  type Card = { id: string; category?: Category };
  const NEW_CATEGORY = 'new-category';
  const FLIP_MS = 150;
  let cards = $derived<Card[]>(
    active
      ? [
          ...(active.unsorted.length > 0 ? [{ id: active.id }] : []),
          ...active.categories.map((category) => ({ id: category.id, category })),
          ...(isRealSpace(active) ? [{ id: NEW_CATEGORY }] : []),
        ]
      : [],
  );

  function dropCard({ detail }: CustomEvent<DndEvent<Card>>) {
    // A category dropped before "Unsorted" or after the new category button goes back between them.
    const rank = (card: Card) => (card.category ? 1 : card.id === NEW_CATEGORY ? 2 : 0);
    cards = detail.items.toSorted((a, b) => rank(a) - rank(b));
    const ids = cards.filter((card) => card.category).map((card) => card.id);
    if (!active || ids.join() === active.categories.map((category) => category.id).join()) return;
    moveItem(detail.info.id, active.id, ids[ids.indexOf(detail.info.id) + 1]);
  }

  async function saveSpace(emoji: string | null, name: string) {
    const title = joinEmoji(emoji, name);
    if (spaceForm === 'rename' && active) {
      await update(active.id, { title });
    } else if (rootId) {
      const id = await create(rootId, title);
      await load();
      select(id);
    }
    spaceForm = null;
  }

  const addLink = (parentId: string) => (url: string, title: string) =>
    void create(parentId, title || defaultTitle(url), url);
  const updateLink = (id: string, changes: { title?: string; url?: string }) => void update(id, changes);

  // Moves are saved one after another, so quick keyboard moves can't overtake each other.
  // If one fails, reloading puts back the real order.
  let moving = Promise.resolve();
  function moveItem(id: string, parentId: string, before: string | undefined) {
    moving = moving.then(() => move(id, { parentId, before })).catch(load);
  }

  // PROTOTYPE for #25 and #50: Rename shows the form, and Delete the question, under the
  // space's tab, or under the ⋯ in variant D.
  let action = $state<{ kind: 'rename' | 'delete'; id: string; left: number; top: number } | null>(null);
  let actionEl = $state<HTMLElement>();
  let spaceActionsEl = $state<HTMLElement>();
  const actionSpace = $derived(action && spaces?.find((space) => space.id === action!.id));

  const bookmarkCount = (space: Space) =>
    space.unsorted.length + space.categories.reduce((sum, category) => sum + category.links.length, 0);
  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

  function deleteQuestion(space: Space) {
    const name = `“${joinEmoji(space.emoji, space.name)}”`;
    const categories = space.categories.length;
    const bookmarks = bookmarkCount(space);
    const links = plural(bookmarks, 'bookmark', 'bookmarks');
    if (categories === 0) return `Delete space ${name} and its ${links}?`;
    const its = `its ${plural(categories, 'category', 'categories')}`;
    return `Delete space ${name} and ${its}${bookmarks > 0 ? ` (${links})` : ''}?`;
  }

  const deleteSpace = (space: Space) => void deleteItem(space.id, `Deleted space “${joinEmoji(space.emoji, space.name)}”`);

  function startAction(kind: 'rename' | 'delete', id: string, anchor: HTMLElement) {
    const space = spaces?.find((space) => space.id === id);
    if (!space) return;
    // An empty space goes straight away, with Undo.
    if (kind === 'delete' && space.categories.length === 0 && space.unsorted.length === 0) {
      action = null;
      return deleteSpace(space);
    }
    const rect = anchor.getBoundingClientRect();
    spaceForm = null;
    action = { kind, id, left: Math.max(16, Math.min(rect.left, innerWidth - 456)), top: rect.bottom + 10 };
  }

  async function renameSpace(id: string, title: string) {
    action = null;
    const split = splitEmoji(title);
    if (split.name) await update(id, { title: joinEmoji(split.emoji, split.name) });
  }

  // Clicking away or Escape leaves the space as it was.
  function onWindowPointerDown(event: PointerEvent) {
    if (action?.kind === 'delete' && !actionEl?.contains(event.target as Node)) action = null;
  }

  async function deleteItem(id: string, message: string) {
    toast = { message, deleted: await remove(id) };
  }

  const deleteLink = (link: Link) => void deleteItem(link.id, `Deleted “${link.title}”`);

  async function undo() {
    const deleted = toast?.deleted;
    if (!deleted) return;
    toast = null;
    try {
      const id = await restore(deleted);
      // A restored space opens again.
      if (deleted.parentId === rootId && isFolder(deleted)) {
        await load();
        select(id);
      }
    } catch {
      toast = { message: `Couldn't restore “${deleted.title}”` };
    }
  }

  function saveCollapsed(ids: string[]) {
    collapsed = ids;
    void setCollapsed(ids);
  }

  function toggle(id: string) {
    saveCollapsed(collapsed.includes(id) ? collapsed.filter((other) => other !== id) : [...collapsed, id]);
  }

  function saveSettings(next: Settings) {
    settings = next;
    void setSettings(next);
  }

  // Both only touch the active space, so other spaces keep their own state.
  const collapseAll = () => saveCollapsed([...new Set([...collapsed, ...cardIds])]);
  const expandAll = () => saveCollapsed(collapsed.filter((id) => !cardIds.includes(id)));

  onMount(() => {
    const unsubscribe = subscribe(load);
    const stopWatchingCollapsed = watchCollapsed((ids) => (collapsed = ids));
    const stopWatchingSettings = watchSettings((next) => (settings = next));
    // The popup saves a page's icon just after the bookmark, so it can arrive after the reload.
    const stopWatchingIcons = watchIcons(load);
    void (async () => {
      [activeId, collapsed, settings] = await Promise.all([getActiveSpaceId(), getCollapsed(), getSettings()]);
      await load();
    })();
    return () => {
      unsubscribe();
      stopWatchingCollapsed();
      stopWatchingSettings();
      stopWatchingIcons();
    };
  });
</script>

<svelte:window onpointerdown={onWindowPointerDown} />

<header class="bar">
  {#if spaces && spaces.length > 0}
    <SpaceTabs
      {spaces}
      activeId={active?.id}
      unsortedId={rootId}
      onselect={select}
      onmove={(id, before) => rootId && moveItem(id, rootId, before)}
      onaction={startAction}
      onrename={(id, title) => void renameSpace(id, title)}
    />
  {/if}
  <div class="space-actions" bind:this={spaceActionsEl}>
    {#if active && isRealSpace(active) && proto.variant === 'd'}
      <Menu
        label="Actions for space {active.name}"
        items={[
          { label: 'Rename', onselect: () => startAction('rename', active.id, spaceActionsEl!) },
          { label: 'Delete', onselect: () => startAction('delete', active.id, spaceActionsEl!), danger: true },
        ]}
      />
    {/if}
    {#if spaces}
      <button class="new-space" aria-label="New space" onclick={() => ((action = null), (spaceForm = 'new'))}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
      </button>
    {/if}
    {#if spaceForm}
      <div class="popover">
        {#key spaceForm}
          <SpaceForm
            heading={spaceForm === 'new' ? 'New space' : 'Rename space'}
            emoji={spaceForm === 'rename' ? active?.emoji : null}
            name={spaceForm === 'rename' ? active?.name : ''}
            onsave={saveSpace}
            oncancel={() => (spaceForm = null)}
          />
        {/key}
      </div>
    {/if}
  </div>
  <div class="end">
    {#if cardIds.length > 0}
      <div class="actions">
        <button onclick={collapseAll}>Collapse all</button>
        <button onclick={expandAll}>Expand all</button>
      </div>
    {/if}
    {#if spaces && spaces.length > 0}
      <SearchBox {spaces} onopen={(url, background) => (background ? void openInBackground([url]) : location.assign(url))} />
    {/if}
    <SettingsPanel {settings} onchange={saveSettings} />
  </div>
</header>

<main>
  {#if error}
    <p class="notice">Couldn't load your bookmarks: {error}</p>
  {:else if spaces === null}
    <!-- Still loading. Rendering nothing avoids flashing the empty state. -->
  {:else if spaces.length === 0}
    <div class="notice">
      <p>Your workspace is empty.</p>
      <p>
        Create a space with the <strong>+</strong> button above, or add a folder inside
        <strong>Other Bookmarks › Workspace</strong> in your browser's bookmarks.
      </p>
    </div>
  {:else if active}
    <div
      class="cards"
      aria-label="Categories"
      use:dragHandleZone={{
        items: cards,
        type: 'category',
        flipDurationMs: FLIP_MS,
        zoneTabIndex: -1,
        dropTargetStyle: {},
        useCursorForDetection: true,
      }}
      onconsider={({ detail }) => (cards = detail.items)}
      onfinalize={dropCard}
    >
      {#each cards as card (card.id)}
        <div class="slot" aria-label={card.category?.title ?? (card.id === NEW_CATEGORY ? 'New category' : UNSORTED)} animate:flip={{ duration: FLIP_MS }}>
          {#if card.category}
            {@const category = card.category}
            <CategoryCard
              id={category.id}
              title={category.title}
              links={category.links}
              collapsed={collapsed.includes(category.id)}
              ontoggle={() => toggle(category.id)}
              onrename={(title) => void update(category.id, { title })}
              ondelete={() => void deleteItem(category.id, `Deleted “${category.title}”`)}
              onopenall={(urls) => void openInBackground(urls)}
              onadd={addLink(category.id)}
              onupdatelink={updateLink}
              ondeletelink={deleteLink}
              onmovelink={(id, before) => moveItem(id, category.id, before)}
            />
          {:else if card.id === NEW_CATEGORY}
            <NewCategory oncreate={(title) => void create(active.id, title)} />
          {:else}
            <CategoryCard
              id={active.id}
              title={UNSORTED}
              links={active.unsorted}
              collapsed={collapsed.includes(active.id)}
              ontoggle={() => toggle(active.id)}
              onopenall={(urls) => void openInBackground(urls)}
              onadd={addLink(active.id)}
              onupdatelink={updateLink}
              ondeletelink={deleteLink}
              onmovelink={(id, before) => moveItem(id, active.id, before)}
            />
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</main>

{#if action && actionSpace}
  {@const space = actionSpace}
  {#key action}
    <div class="anchored" style:left="{action.left}px" style:top="{action.top}px" bind:this={actionEl}>
      {#if action.kind === 'rename'}
        <SpaceForm
          heading="Rename space"
          emoji={space.emoji}
          name={space.name}
          onsave={(emoji, name) => void renameSpace(space.id, joinEmoji(emoji, name))}
          oncancel={() => (action = null)}
        />
      {:else}
        <!-- The listener catches Escape from the buttons inside, which are interactive. -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="confirm"
          role="alertdialog"
          tabindex="-1"
          aria-label="Delete space"
          onkeydown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              action = null;
            }
          }}
        >
          <p>{deleteQuestion(space)}</p>
          <div class="buttons">
            <button
              class="danger"
              onclick={() => {
                const target = space;
                action = null;
                deleteSpace(target);
              }}>Delete</button
            >
            <button onclick={() => (action = null)} {@attach (button) => button.focus()}>Cancel</button>
          </div>
        </div>
      {/if}
    </div>
  {/key}
{/if}

<!-- PROTOTYPE for #25 and #50, only in development builds. -->
{#if import.meta.env.DEV}
  <PrototypeSwitcher />
{/if}

{#if toast}
  <!-- Keyed, so a new delete restarts the countdown. -->
  {#key toast}
    <Toast message={toast.message} onundo={toast.deleted ? undo : undefined} ondismiss={() => (toast = null)} />
  {/key}
{/if}

<style>
  .bar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 52px;
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bar);
  }
  .space-actions {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .new-space {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    color: var(--muted);
  }
  .new-space:hover {
    background: var(--row-hover);
    color: var(--fg);
  }
  .new-space svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
  }
  .popover {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    z-index: 20;
  }
  .anchored {
    position: fixed;
    z-index: 20;
  }
  .confirm {
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
  .confirm p {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .confirm .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
  .confirm button {
    height: 28px;
    padding: 0 12px;
    border-radius: 6px;
    color: var(--muted);
  }
  .confirm button:hover {
    background: var(--row-hover);
    color: var(--fg);
  }
  .confirm .danger {
    background: var(--danger);
    color: var(--bg);
    font-weight: 600;
  }
  .confirm .danger:hover {
    background: var(--danger);
    color: var(--bg);
    filter: brightness(1.1);
  }
  .end {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
  .actions {
    display: flex;
    gap: 4px;
  }
  .actions button {
    height: 30px;
    padding: 0 10px;
    border-radius: 8px;
    color: var(--muted);
    font-size: 12px;
  }
  .actions button:hover {
    background: var(--row-hover);
    color: var(--fg);
  }
  main {
    padding: 20px;
  }
  .cards {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 16px;
  }
  /* Fixed sizing: columns of one card width, stretched to fill the row. */
  :global(:root[data-sizing='fixed']) .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--card-width), 1fr));
    align-items: start;
  }
  .notice {
    max-width: 520px;
    margin: 60px auto;
    color: var(--muted);
    text-align: center;
  }
  .notice strong {
    color: var(--fg);
  }
</style>
