<script lang="ts">
  import { onMount } from 'svelte';
  import Countdown from '@/components/Countdown.svelte';
  import SaveForm from '@/components/SaveForm.svelte';
  import { getWorkspace } from '@/lib/bookmarks';
  import { getLastCategoryId } from '@/lib/meta';
  import { currentPage, savePage, type Page } from '@/lib/save';
  import { getSettings } from '@/lib/settings';
  import { placeName, toSpaces, toWebUrl, type Space } from '@/lib/tree';

  // How long "Saved to …" shows before the popup closes.
  const CLOSE_AFTER_MS = 4000;

  // PROTOTYPE for #48: the new tab page shows this popup in a frame, already saved.
  const demo = new URLSearchParams(location.search).has('demo');

  let loaded = $state<{ page: Page | null; spaces: Space[]; lastCategoryId?: string } | null>(null);
  let saved = $state<string | null>(null);
  let error = $state<string | null>(null);

  // The countdown pauses once the pointer moves over the popup, not while it stays where it
  // was when Save was clicked.
  let paused = $state(false);

  // PROTOTYPE for #48: closing on its own fades the content first. OK closes at once.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fading = $state(false);
  function fadeOut() {
    if (still) return close();
    fading = true;
    setTimeout(close, 150);
  }

  const hasCategories = $derived(loaded?.spaces.some((space) => space.categories.length > 0));

  onMount(async () => {
    if (demo) {
      saved = new URLSearchParams(location.search).get('demo') || 'Work › Reading';
      return;
    }
    try {
      const [page, workspace, lastCategoryId, settings] = await Promise.all([
        currentPage(),
        getWorkspace(),
        getLastCategoryId(),
        getSettings(),
      ]);
      Object.assign(document.documentElement.dataset, settings);
      loaded = { page, spaces: toSpaces(workspace), lastCategoryId };
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  });

  async function save(categoryId: string, url: string, title: string) {
    const { page, spaces } = loaded!;
    // The tab's icon only belongs to pages on the same site.
    const sameSite = new URL(url).hostname === new URL(page!.url).hostname;
    try {
      await savePage(categoryId, { url, title, ...(sameSite && page!.favIconUrl && { favIconUrl: page!.favIconUrl }) });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      return;
    }
    const space = spaces.find((space) => space.categories.some((category) => category.id === categoryId))!;
    saved = placeName(space, space.categories.find((category) => category.id === categoryId));
  }

  function close() {
    if (demo) parent.postMessage('prototype:close', location.origin);
    else window.close();
  }
</script>

<main class:fading onpointermove={() => (paused = true)} onpointerleave={() => (paused = false)}>
  {#if !saved}
    <h1>Save to workspace</h1>
  {/if}
  {#if error}
    <p class="notice">Couldn't save: {error}</p>
  {:else if saved}
    <p class="saved" role="status"><span aria-hidden="true">✓</span> Saved to {saved}</p>
    <div class="buttons">
      <button class="ok" onclick={close}>OK</button>
    </div>
    <!-- No line in the popup: the countdown only times it. -->
    <Countdown shape="bar" hidden duration={CLOSE_AFTER_MS} {paused} ondone={fadeOut} />
  {:else if !loaded}
    <!-- Still loading. -->
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
</main>

<style>
  main {
    position: relative;
    width: 320px;
    overflow: hidden;
    padding: 14px 16px 16px;
  }
  .fading {
    opacity: 0;
    transition: opacity 150ms;
  }
  h1 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
  }
  .notice {
    margin: 0;
    color: var(--muted);
  }
  .saved {
    margin: 0;
    padding: 12px 0;
    font-weight: 600;
    /* Long names wrap, even a single long word. */
    overflow-wrap: anywhere;
  }
  .saved span {
    color: var(--accent);
  }
  .buttons {
    display: flex;
    justify-content: flex-end;
  }
  .ok {
    height: 28px;
    padding: 0 12px;
    border-radius: 6px;
    color: var(--accent);
    font-weight: 600;
  }
  .ok:hover {
    background: var(--row-hover);
  }
</style>
