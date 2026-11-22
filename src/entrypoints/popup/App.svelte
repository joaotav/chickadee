<script lang="ts">
  import { onMount } from 'svelte';
  import LinkIcon from '@/components/LinkIcon.svelte';
  import SaveForm from '@/components/SaveForm.svelte';
  import { getWorkspace } from '@/lib/bookmarks';
  import { countdown } from '@/lib/countdown';
  import { getLastCategoryId } from '@/lib/meta';
  import { currentPage, savePage, type Page } from '@/lib/save';
  import { getSettings } from '@/lib/settings';
  import { cycle, proto, VARIANTS } from '@/lib/prototype.svelte';
  import { placeName, toSpaces, toWebUrl, type Link, type Space } from '@/lib/tree';

  // How long "Saved to …" shows before the popup closes on its own.
  const CLOSE_AFTER_MS = 4000;

  let loaded = $state<{ page: Page | null; spaces: Space[]; lastCategoryId?: string } | null>(null);
  let saved = $state<{ place: string; emoji: string | null; link: Link } | null>(null);
  let error = $state<string | null>(null);
  let timer: ReturnType<typeof countdown> | undefined;
  let fading = $state(false);
  let paused = $state(false);
  // PROTOTYPE: the countdown starts over instead of closing the popup, so each variant can be
  // looked at for as long as needed. Each round restarts the countdown line.
  let round = $state(0);

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
    try {
      await savePage(categoryId, { url, title, ...(sameSite && page!.favIconUrl && { favIconUrl: page!.favIconUrl }) });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      return;
    }
    showSaved(categoryId, url, title, sameSite ? page!.favIconUrl : undefined);
  }

  function showSaved(categoryId: string, url: string, title: string, icon?: string) {
    const space = loaded!.spaces.find((space) => space.categories.some((category) => category.id === categoryId))!;
    const place = placeName(space, space.categories.find((category) => category.id === categoryId));
    saved = { place, emoji: space.emoji, link: { id: '', title, url, openable: true, ...(icon && { icon }) } };
    timer = countdown(CLOSE_AFTER_MS, fadeOut);
  }

  // PROTOTYPE: shows the message for the current page without saving it.
  function preview() {
    const { page, spaces, lastCategoryId } = loaded!;
    const categories = spaces.flatMap((space) => space.categories);
    const category = categories.find((category) => category.id === lastCategoryId) ?? categories[0]!;
    showSaved(category.id, page!.url, page!.title, page!.favIconUrl);
  }

  // Closing on its own fades the message out first. OK closes the popup at once.
  function fadeOut() {
    if (import.meta.env.DEV) {
      round++;
      timer = countdown(CLOSE_AFTER_MS, fadeOut);
      if (paused) timer.pause();
      return;
    }
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
    {#if proto.variant === 'a'}
      <p class="saved" role="status"><span aria-hidden="true">✓</span> Saved to {saved.place}</p>
    {:else}
      <div class="done" class:left={proto.variant === 'c'} role="status">
        {#if proto.variant === 'c'}
          <p class="heading"><span class="tick" aria-hidden="true">✓</span> Saved</p>
        {:else if proto.variant === 'e'}
          <p class="heading">Saved</p>
        {:else}
          <div class="badge" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" /></svg>
          </div>
          <p class="heading">Saved</p>
        {/if}
        {#if proto.variant !== 'b'}
          <div class="bookmark">
            <LinkIcon link={saved.link} />
            <span class="title">{saved.link.title}</span>
          </div>
        {/if}
        <p class="where">
          {proto.variant === 'b' ? 'to' : 'in'}
          {#if saved.emoji}{saved.emoji}{/if}
          {saved.place}
        </p>
      </div>
    {/if}
    <div class="buttons">
      <button onclick={() => window.close()}>OK</button>
    </div>
    {#if proto.variant !== 'a'}
      <!-- A line along the bottom that shrinks as the time runs out, like the new tab page's messages. -->
      {#key round}
        <div class="countdown" class:paused style:animation-duration="{CLOSE_AFTER_MS}ms" aria-hidden="true"></div>
      {/key}
    {/if}
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
  <!-- PROTOTYPE, only in development builds. -->
  {#if import.meta.env.DEV}
    <div class="proto">
      <span class="tag">Prototype</span>
      <button aria-label="Previous" onclick={() => cycle(-1)}>‹</button>
      <span class="value">{proto.variant.toUpperCase()} · {VARIANTS[proto.variant].name}</span>
      <button aria-label="Next" onclick={() => cycle(1)}>›</button>
      {#if !saved && loaded?.page && toWebUrl(loaded.page.url) && hasCategories}
        <button class="preview" onclick={preview}>Preview</button>
      {/if}
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
  .done {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 6px 0 4px;
    text-align: center;
    overflow-wrap: anywhere;
  }
  .done.left {
    align-items: stretch;
    text-align: left;
  }
  .done p {
    margin: 0;
  }
  .heading {
    font-size: 15px;
    font-weight: 600;
  }
  .tick {
    color: var(--accent);
  }
  .badge {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin-bottom: 2px;
    border-radius: 50%;
    background: var(--accent-fill);
    animation: pop 250ms ease-out;
  }
  .badge svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: var(--bg);
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 20;
    stroke-dashoffset: 20;
    animation: draw 300ms 150ms ease-out forwards;
  }
  @keyframes pop {
    from {
      transform: scale(0.6);
      opacity: 0;
    }
  }
  @keyframes draw {
    to {
      stroke-dashoffset: 0;
    }
  }
  .bookmark {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 100%;
    height: 34px;
    margin-top: 4px;
    padding: 0 10px;
    border-radius: 6px;
    background: var(--row);
  }
  .done:not(.left) .bookmark {
    width: 100%;
  }
  .bookmark .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .where {
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
  @media (prefers-reduced-motion: reduce) {
    .countdown {
      display: none;
    }
    .badge,
    .badge svg {
      animation: none;
      stroke-dashoffset: 0;
    }
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
  .proto button:hover {
    background: #555;
  }
  .proto .preview {
    font-size: 11px;
    border: 1px solid #888;
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
