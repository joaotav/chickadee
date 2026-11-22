<script lang="ts">
  import { onMount } from 'svelte';
  import LinkIcon from '@/components/LinkIcon.svelte';
  import SaveForm from '@/components/SaveForm.svelte';
  import SessionForm from '@/components/SessionForm.svelte';
  import { cycle, proto, VARIANTS } from '@/lib/prototype.svelte';
  import { hasTabs, requestTabs, saveSession, windowPages } from '@/lib/session';
  import { getWorkspace } from '@/lib/bookmarks';
  import { countdown } from '@/lib/countdown';
  import { getLastCategoryId } from '@/lib/meta';
  import { currentPage, savePage, type Page } from '@/lib/save';
  import { getSettings } from '@/lib/settings';
  import { joinEmoji, placeName, toSpaces, toWebUrl, type Link, type Space } from '@/lib/tree';

  // How long "Saved to …" shows before the popup closes on its own.
  const CLOSE_AFTER_MS = 4000;

  let loaded = $state<{ page: Page | null; spaces: Space[]; lastCategoryId?: string; rootId: string } | null>(null);
  // The saved bookmark, or the saved session's name and size, and where it went with the space's icon.
  let saved = $state<{ link: Link; place: string; count?: number } | null>(null);
  // PROTOTYPE (#35): saving one page, or all the window's tabs as a session.
  let mode = $state<'page' | 'session'>('page');
  let tabCount = $state<number | null>(null);
  let notice = $state<string | null>(null);
  // Sessions go in a space, not the "Unsorted" tab.
  const sessionSpaces = $derived(loaded?.spaces.filter((space) => space.id !== loaded!.rootId) ?? []);
  const lastSpaceId = $derived(
    loaded?.spaces.find((space) => space.categories.some((category) => category.id === loaded!.lastCategoryId))?.id,
  );
  let error = $state<string | null>(null);
  let timer: ReturnType<typeof countdown> | undefined;
  let fading = $state(false);
  let paused = $state(false);

  const hasCategories = $derived(loaded?.spaces.some((space) => space.categories.length > 0));

  onMount(async () => {
    try {
      const [page, workspace, lastCategoryId, settings] = await Promise.all([
        currentPage(),
        getWorkspace(),
        getLastCategoryId(),
        getSettings(),
      ]);
      Object.assign(document.documentElement.dataset, settings);
      loaded = { page, spaces: toSpaces(workspace), lastCategoryId, rootId: workspace.id };
      // The number of tabs is only known once the `tabs` permission is granted.
      if (await hasTabs()) tabCount = (await windowPages()).length;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  });

  async function save(categoryId: string, url: string, title: string) {
    const { page, spaces } = loaded!;
    // The tab's icon only belongs to pages on the same site.
    const sameSite = new URL(url).hostname === new URL(page!.url).hostname;
    const icon = sameSite ? page!.favIconUrl : undefined;
    try {
      await savePage(categoryId, { url, title, ...(icon && { favIconUrl: icon }) });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      return;
    }
    const space = spaces.find((space) => space.categories.some((category) => category.id === categoryId))!;
    const place = placeName(space, space.categories.find((category) => category.id === categoryId));
    saved = {
      link: { id: '', title, url, openable: true, ...(icon && { icon }) },
      place: space.emoji ? `${space.emoji} ${place}` : place,
    };
    // Pointer moves over the form don't count, so the countdown and its line start running.
    paused = false;
    timer = countdown(CLOSE_AFTER_MS, fadeOut);
  }

  async function saveTabs(spaceId: string, name: string) {
    // The first thing the submit does, as the permission request needs.
    const granted = await requestTabs();
    if (!granted) {
      notice = 'Saving all tabs needs permission to read them. Nothing was saved.';
      return;
    }
    notice = null;
    const pages = await windowPages();
    if (pages.length === 0) {
      notice = 'No web pages are open in this window, apart from pinned tabs.';
      return;
    }
    try {
      await saveSession(spaceId, name, pages);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      return;
    }
    const space = loaded!.spaces.find((space) => space.id === spaceId)!;
    saved = { link: { id: '', title: name, url: '', openable: false }, place: joinEmoji(space.emoji, space.name), count: pages.length };
    paused = false;
    timer = countdown(CLOSE_AFTER_MS, fadeOut);
  }

  // Closing on its own fades the message out first. OK closes the popup at once.
  function fadeOut() {
    fading = true;
    setTimeout(() => window.close(), 150);
  }
</script>

<!-- The countdown pauses once the pointer moves over the popup, not while it stays where it
     was when Save was clicked. -->
<main
  class:fading
  onpointermove={() => {
    paused = true;
    timer?.pause();
  }}
  onpointerleave={() => {
    paused = false;
    timer?.resume();
  }}
>
  {#if !saved}
    {#if proto.variant === 'b' && loaded}
      <div class="switch" role="tablist">
        <button role="tab" aria-selected={mode === 'page'} onclick={() => (mode = 'page')}>This page</button>
        <button role="tab" aria-selected={mode === 'session'} onclick={() => (mode = 'session')}>All tabs</button>
      </div>
    {:else}
      <h1>{mode === 'session' ? 'Save all tabs' : 'Save to workspace'}</h1>
    {/if}
  {/if}
  {#if notice && !saved}
    <p class="notice warn">{notice}</p>
  {/if}
  {#if error}
    <p class="notice">Couldn't save: {error}</p>
  {:else if saved}
    <div class="saved" role="status">
      <p class="heading">Saved</p>
      <div class="bookmark">
        {#if saved.count !== undefined}
          <svg class="folder" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="2" /><path d="M2 6h12" /></svg>
          <span class="title">{saved.link.title}</span>
          <span class="count">{saved.count} {saved.count === 1 ? 'bookmark' : 'bookmarks'}</span>
        {:else}
          <LinkIcon link={saved.link} />
          <span class="title">{saved.link.title}</span>
        {/if}
      </div>
      <p class="place">in {saved.place}</p>
    </div>
    <div class="buttons">
      <button onclick={() => window.close()}>OK</button>
    </div>
    <!-- A line along the bottom that shrinks as the time runs out, like the new tab page's messages. -->
    <div class="countdown" class:paused style:animation-duration="{CLOSE_AFTER_MS}ms" aria-hidden="true"></div>
  {:else if !loaded}
    <!-- Still loading. -->
  {:else if mode === 'session'}
    {#if sessionSpaces.length === 0}
      <p class="notice">Create a space on the new tab page first, then save tabs into it.</p>
    {:else}
      <SessionForm spaces={sessionSpaces} spaceId={lastSpaceId} count={tabCount} onsave={saveTabs} oncancel={() => (proto.variant === 'b' ? window.close() : (mode = 'page'))} />
    {/if}
  {:else if !loaded.page || !toWebUrl(loaded.page.url)}
    <p class="notice">Only web pages can be saved.</p>
  {:else if !hasCategories}
    <p class="notice">Create a category on the new tab page first, then save pages into it.</p>
  {:else}
    <SaveForm
      url={loaded.page.url}
      title={loaded.page.title}
      spaces={loaded.spaces}
      categoryId={loaded.lastCategoryId}
      onsave={save}
      oncancel={() => window.close()}
    />
  {/if}
  {#if proto.variant === 'a' && loaded && !saved && mode === 'page' && sessionSpaces.length > 0}
    <button class="all-tabs" onclick={() => (mode = 'session')}>
      {tabCount === null ? 'Save all tabs in this window…' : `Save all ${tabCount} tabs in this window…`}
    </button>
  {/if}
  <!-- PROTOTYPE, only in development builds. -->
  {#if import.meta.env.DEV}
    <div class="proto">
      <span class="tag">Prototype</span>
      <button aria-label="Previous" onclick={() => cycle(-1)}>‹</button>
      <span class="value">{proto.variant.toUpperCase()} · {VARIANTS[proto.variant].name}</span>
      <button aria-label="Next" onclick={() => cycle(1)}>›</button>
    </div>
  {/if}
</main>

<style>
  main {
    position: relative;
    width: 320px;
    padding: 14px 16px 16px;
  }
  h1 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
  }
  .warn {
    margin-bottom: 10px;
    color: var(--danger);
  }
  .switch {
    display: flex;
    gap: 2px;
    margin-bottom: 12px;
    padding: 3px;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .switch button {
    flex: 1;
    height: 26px;
    border-radius: 6px;
    color: var(--muted);
    font-weight: 500;
  }
  .switch button[aria-selected='true'] {
    background: var(--row-hover);
    color: var(--fg);
  }
  .all-tabs {
    width: 100%;
    margin-top: 12px;
    padding: 10px 0 0;
    border-top: 1px solid var(--border);
    color: var(--accent);
    font-weight: 500;
    text-align: left;
  }
  .all-tabs:hover {
    text-decoration: underline;
  }
  .folder {
    flex: none;
    width: 16px;
    height: 16px;
    fill: none;
    stroke: var(--muted);
    stroke-width: 1.4;
  }
  .bookmark .count {
    margin-left: auto;
    color: var(--muted);
    font-size: 12px;
    white-space: nowrap;
  }
  .proto {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 12px;
    padding: 4px 8px;
    border: 2px solid #ffd60a;
    border-radius: 999px;
    background: #000;
    color: #fff;
    font: 11px/1.2 system-ui, sans-serif;
    white-space: nowrap;
  }
  .proto .tag {
    padding: 1px 6px;
    border-radius: 999px;
    background: #ffd60a;
    color: #000;
    font-weight: 700;
  }
  .proto .value {
    flex: 1;
    text-align: center;
    font-weight: 600;
  }
  .proto button {
    padding: 0 6px;
    border-radius: 999px;
    color: #fff;
    font-size: 14px;
  }
  .notice {
    margin: 0;
    color: var(--muted);
  }
  .fading {
    opacity: 0;
    transition: opacity 150ms;
  }
  @media (prefers-reduced-motion: reduce) {
    .fading {
      transition: none;
    }
    .countdown {
      display: none;
    }
  }
  .saved {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 6px 0 4px;
    text-align: center;
    /* Long names wrap, even a single long word. */
    overflow-wrap: anywhere;
  }
  .saved p {
    margin: 0;
  }
  .heading {
    font-size: 15px;
    font-weight: 600;
  }
  /* The bookmark as it looks on the new tab page. */
  .bookmark {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 34px;
    margin-top: 4px;
    padding: 0 10px;
    border-radius: 6px;
    background: var(--row);
  }
  .bookmark .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .place {
    color: var(--muted);
  }
  .countdown {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--accent);
    transform-origin: left;
    animation: shrink linear forwards;
  }
  .countdown.paused {
    animation-play-state: paused;
  }
  @keyframes shrink {
    to {
      transform: scaleX(0);
    }
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
  }
  .buttons button {
    height: 28px;
    padding: 0 12px;
    border-radius: 6px;
    color: var(--accent);
    font-weight: 600;
  }
  .buttons button:hover {
    background: var(--row-hover);
  }
</style>
