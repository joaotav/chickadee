<script lang="ts">
  import { onMount } from 'svelte';
  import LinkIcon from '@/components/LinkIcon.svelte';
  import SaveForm from '@/components/SaveForm.svelte';
  import { getWorkspace } from '@/lib/bookmarks';
  import { countdown } from '@/lib/countdown';
  import { getLastCategoryId } from '@/lib/meta';
  import { currentPage, savePage, type Page } from '@/lib/save';
  import { getSettings } from '@/lib/settings';
  import { placeName, toSpaces, toWebUrl, type Link, type Space } from '@/lib/tree';

  // How long "Saved to …" shows before the popup closes on its own.
  const CLOSE_AFTER_MS = 4000;

  let loaded = $state<{ page: Page | null; spaces: Space[]; lastCategoryId?: string } | null>(null);
  // The saved bookmark, and where it went with the space's icon.
  let saved = $state<{ link: Link; place: string } | null>(null);
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
      loaded = { page, spaces: toSpaces(workspace), lastCategoryId };
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
    <h1>Save to workspace</h1>
  {/if}
  {#if error}
    <p class="notice">Couldn't save: {error}</p>
  {:else if saved}
    <div class="saved" role="status">
      <p class="heading">Saved</p>
      <div class="bookmark">
        <LinkIcon link={saved.link} />
        <span class="title">{saved.link.title}</span>
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
    padding: 14px 16px 16px;
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
