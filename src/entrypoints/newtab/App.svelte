<script lang="ts">
  import { onMount } from 'svelte';
  import { dragHandleZone, setKeyboardDragTrigger, type DndEvent } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import CategoryCard from '@/components/CategoryCard.svelte';
  import DeleteSpace from '@/components/DeleteSpace.svelte';
  import NewCategory from '@/components/NewCategory.svelte';
  import SearchBox from '@/components/SearchBox.svelte';
  import SettingsPanel from '@/components/SettingsPanel.svelte';
  import { readFile, toHtml, type BookmarksFile } from '@/lib/bookmarks-file';
  import SpaceForm from '@/components/SpaceForm.svelte';
  import SpaceTabs from '@/components/SpaceTabs.svelte';
  import Toast from '@/components/Toast.svelte';
  import type { PlaceGroup } from '@/components/Menu.svelte';
  import { create, getWorkspace, move, position, subscribe, update } from '@/lib/bookmarks';
  import { isFolder, type BookmarkNode } from '@/lib/node';
  import { getActiveSpaceId, getCollapsed, getIcons, setActiveSpaceId, setCollapsed, watchCollapsed, watchIcons } from '@/lib/meta';
  import { cacheSettings, getCachedSettings, getSettings, setSettings, watchSettings, type Settings } from '@/lib/settings';
  import { defaultTitle, joinEmoji, otherCopies, sameName, toSpaces, UNSORTED, type Category, type Link, type Space } from '@/lib/tree';
  import { pickFile, saveFile } from '@/lib/files';
  import { importFile, takenSpaces, undoImport } from '@/lib/import';
  import { openInBackground } from '@/lib/tabs';
  import { merge, remove, restore, unmerge, type Merged } from '@/lib/undo';

  let spaces = $state<Space[] | null>(null);
  let rootId = $state<string | undefined>();
  // The new space form shows under the + button. Rename and the delete question show under the
  // selected tab, `tabOffset` pixels to the left of the + button.
  let spaceForm = $state<'new' | 'rename' | 'delete' | null>(null);
  let tabOffset = $state(0);
  let spaceActions: HTMLElement;
  // The tabs get the room left of the search, less the + button and the gap before it.
  let spacesWidth = $state(0);
  let actionsWidth = $state(0);
  // The toast after a delete or a move holds how to undo it. Only the most recent can be.
  let toast = $state<{ message: string; undo?: () => void } | null>(null);
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
    if (spaceForm !== 'new') spaceForm = null;
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

  // Names a category in the open space can't take: the other categories', and Unsorted while its card shows.
  const categoryNames = (exceptId?: string) =>
    active
      ? [
          ...(active.unsorted.length > 0 ? [UNSORTED] : []),
          ...active.categories.filter((category) => category.id !== exceptId).map((category) => category.title),
        ]
      : [];

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

  function openUnderTab(kind: 'rename' | 'delete', tab: HTMLElement) {
    // An empty space goes without asking, with Undo like everything else.
    if (kind === 'delete' && active && active.categories.length === 0 && active.unsorted.length === 0) {
      return deleteSpace(active);
    }
    tabOffset = tab.getBoundingClientRect().left - spaceActions.getBoundingClientRect().left;
    spaceForm = kind;
  }

  function deleteSpace(space: Space) {
    spaceForm = null;
    void deleteItem(space.id, `Deleted space “${joinEmoji(space.emoji, space.name)}”`);
  }

  async function deleteItem(id: string, message: string) {
    const deleted = await remove(id);
    toast = { message, undo: () => void undoDelete(deleted) };
  }

  const deleteLink = (link: Link) => void deleteItem(link.id, `Deleted “${link.title}”`);

  async function undoDelete(deleted: BookmarkNode) {
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

  // Where categories and links can move to: the spaces, not counting the "Unsorted" tab,
  // which holds links only, and their categories.
  const spaceLabel = (space: Space) => joinEmoji(space.emoji, space.name);
  const realSpaces = $derived((spaces ?? []).filter(isRealSpace));

  // Links saved more than once, marked unless the settings say not to.
  const alsoIn = $derived(settings.duplicates === 'mark' ? otherCopies(spaces ?? []) : new Map<string, string[]>());
  const otherSpaces = $derived<PlaceGroup[]>(
    realSpaces.length > 1
      ? [{ places: realSpaces.filter((space) => space.id !== active?.id).map((space) => ({ id: space.id, label: spaceLabel(space) })) }]
      : [],
  );
  const categories = $derived<PlaceGroup[]>(
    realSpaces
      .filter((space) => space.categories.length > 0)
      .map((space) => ({ label: spaceLabel(space), places: space.categories.map((category) => ({ id: category.id, label: category.title })) })),
  );

  // Moves to the end of `parentId`. Undo puts it back where it was.
  async function moveTo(id: string, parentId: string, message: string) {
    const from = await position(id);
    moveItem(id, parentId, undefined);
    toast = {
      message,
      undo: () => {
        toast = null;
        moveItem(id, from.parentId, from.before);
      },
    };
  }

  // A space can't hold two categories with the same name, so moving into one that has it
  // returns a question for the card to ask, and merges them if the answer is Merge.
  function moveCategory(category: Category, spaceId: string) {
    const space = realSpaces.find((space) => space.id === spaceId)!;
    const same = space.categories.find((other) => sameName(other.title, category.title));
    if (same) {
      return {
        question: `Merge with ${spaceLabel(space)} › ${same.title}?`,
        detail: `${space.name} already has a category with this name.`,
        merge: () => void mergeCategory(category, same, space),
      };
    }
    void moveTo(category.id, spaceId, `Moved “${category.title}” to ${spaceLabel(space)}`);
  }

  async function mergeCategory(category: Category, into: Category, space: Space) {
    const merged = await merge(category.id, into.id);
    toast = { message: `Merged “${category.title}” into ${spaceLabel(space)} › ${into.title}`, undo: () => void undoMerge(merged) };
  }

  async function undoMerge(merged: Merged) {
    toast = null;
    try {
      await unmerge(merged);
    } catch {
      toast = { message: `Couldn't put back “${merged.folder.title}”` };
    }
  }

  function moveLink(link: Link, categoryId: string) {
    const space = realSpaces.find((space) => space.categories.some((category) => category.id === categoryId))!;
    const category = space.categories.find((category) => category.id === categoryId)!;
    void moveTo(link.id, categoryId, `Moved “${link.title}” to ${spaceLabel(space)} › ${category.title}`);
  }

  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

  // Named after the day, like chickadee-bookmarks-2026-11-22.html.
  async function exportFile() {
    saveFile(`chickadee-bookmarks-${new Date().toLocaleDateString('en-CA')}.html`, toHtml(await getWorkspace()));
  }

  // Imports a bookmarks file. When spaces in it are already here, returns the question to
  // ask first, and the import to run with the answer.
  function startImport(html: string) {
    const file = readFile(html);
    const taken = takenSpaces(file, realSpaces.map((space) => space.name));
    if (taken.length > 0) return { taken, run: (mode: 'merge' | 'separate') => void runImport(file, mode) };
    void runImport(file, 'merge');
  }

  async function importFromEmptyPage() {
    const html = await pickFile();
    if (html !== null) startImport(html)?.run('merge');
  }

  async function runImport(file: BookmarksFile, mode: 'merge' | 'separate') {
    if (file.spaces.length === 0 && file.loose.length === 0) {
      toast = { message: 'No bookmarks found in this file' };
      return;
    }
    const result = await importFile(file, await getWorkspace(), mode);
    if (result.created.length === 0) {
      toast = { message: result.refused > 0 ? "Couldn't add the bookmarks in this file" : 'Everything in this file is already here' };
      return;
    }
    await load();
    select(result.spaces[0]!);
    const refused = result.refused > 0 ? `. ${plural(result.refused, 'bookmark')} the browser didn't accept ${result.refused === 1 ? 'was' : 'were'} left out` : '';
    toast = {
      message: `Imported ${plural(result.links, 'bookmark')} in ${plural(result.spaces.length, 'space')}${refused}`,
      undo: () => {
        toast = null;
        void undoImport(result.created);
      },
    };
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

<header class="bar">
  <div class="spaces" bind:clientWidth={spacesWidth}>
    {#if spaces && spaces.length > 0}
      <SpaceTabs
        {spaces}
        activeId={active?.id}
        unsortedId={rootId}
        room={spacesWidth - actionsWidth - 8}
        onselect={select}
        onmove={(id, before) => rootId && moveItem(id, rootId, before)}
        onrename={(tab) => openUnderTab('rename', tab)}
        ondelete={(tab) => openUnderTab('delete', tab)}
      />
    {/if}
    <div class="space-actions" bind:this={spaceActions} bind:clientWidth={actionsWidth}>
      {#if spaces}
        <button class="new-space" aria-label="New space" onclick={() => (spaceForm = 'new')}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
        </button>
      {/if}
      {#if spaceForm}
        <div class="popover" style:left="{spaceForm === 'new' ? 0 : tabOffset}px">
          {#if spaceForm === 'delete'}
            {#if active}
              {@const space = active}
              <DeleteSpace {space} ondelete={() => deleteSpace(space)} oncancel={() => (spaceForm = null)} />
            {/if}
          {:else}
            {#key spaceForm}
              <SpaceForm
                heading={spaceForm === 'new' ? 'New space' : 'Rename space'}
                emoji={spaceForm === 'rename' ? active?.emoji : null}
                name={spaceForm === 'rename' ? active?.name : ''}
                taken={(spaces ?? []).filter((space) => spaceForm === 'new' || space.id !== active?.id).map((space) => space.name)}
                onsave={saveSpace}
                oncancel={() => (spaceForm = null)}
              />
            {/key}
          {/if}
        </div>
      {/if}
    </div>
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
    <SettingsPanel {settings} onchange={saveSettings} onexport={() => void exportFile()} onimport={startImport} />
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
      <p>Or bring in links from another browser or tool:</p>
      <button class="import" onclick={() => void importFromEmptyPage()}>Import bookmarks…</button>
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
              taken={categoryNames(category.id)}
              ondelete={() => void deleteItem(category.id, `Deleted “${category.title}”`)}
              onopenall={(urls) => void openInBackground(urls)}
              onadd={addLink(category.id)}
              onupdatelink={updateLink}
              ondeletelink={deleteLink}
              onmovelink={(id, before) => moveItem(id, category.id, before)}
              spaces={otherSpaces}
              onmove={(spaceId) => moveCategory(category, spaceId)}
              linkPlaces={categories}
              onmovelinkto={moveLink}
              {alsoIn}
            />
          {:else if card.id === NEW_CATEGORY}
            <NewCategory oncreate={(title) => void create(active.id, title)} taken={categoryNames()} />
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
              linkPlaces={categories}
              onmovelinkto={moveLink}
              {alsoIn}
            />
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</main>

{#if toast}
  <!-- Keyed, so a new delete restarts the countdown. -->
  {#key toast}
    <Toast message={toast.message} onundo={toast.undo} ondismiss={() => (toast = null)} />
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
  .spaces {
    display: flex;
    flex: 1 1 0;
    align-items: center;
    gap: 8px;
    min-width: 0;
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
  .notice .import {
    padding: 6px 14px;
    border-radius: 7px;
    background: var(--accent-fill);
    color: var(--bg);
    font-weight: 600;
  }
  .notice .import:hover {
    filter: brightness(1.1);
  }
</style>
