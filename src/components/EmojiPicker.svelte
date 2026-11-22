<script lang="ts">
  // Every emoji, from emoji-picker-element. Its data is part of the extension, so the picker
  // never downloads it from a CDN.
  import 'emoji-picker-element';
  import { Database } from 'emoji-picker-element';
  import dataSource from 'emoji-picker-element-data/en/emojibase/data.json?url';
  import { outside } from '@/lib/outside';

  let {
    onpick,
  }: {
    /** The picked emoji, or null for no icon. */
    onpick: (emoji: string | null) => void;
  } = $props();

  // The picker has a light and a dark look. Only Rosé Pine Dawn is light.
  const light = document.documentElement.dataset.theme === 'rose-pine-dawn';

  let wrap: HTMLElement;
  // An emoji with skin tones, waiting for one of them, and where its popup goes.
  let toned = $state<{ name: string; options: string[]; top: number; left: number } | null>(null);
  // The emoji button last clicked. Its click comes before the picker's emoji-click event,
  // which doesn't say which button it was.
  let clicked: DOMRect | null = null;
  // Six tones of 32 pixels, with the gaps, padding and border around them.
  const TONES_WIDTH = 6 * 32 + 5 * 2 + 12;
  const TONES_HEIGHT = 32 + 12;

  // Under the clicked emoji, or above it when there's no room below, kept inside the picker.
  function place(rect: DOMRect) {
    const box = wrap.getBoundingClientRect();
    const left = Math.min(Math.max(rect.left - box.left + rect.width / 2 - TONES_WIDTH / 2, 0), box.width - TONES_WIDTH);
    const below = rect.bottom - box.top + 4;
    const top = below + TONES_HEIGHT <= box.height ? below : rect.top - box.top - TONES_HEIGHT - 4;
    return { top, left };
  }

  const setUp = (picker: HTMLElement) => {
    // The picker's own skin tone button sets one tone for every emoji. Each emoji with tones
    // offers them instead.
    const style = document.createElement('style');
    style.textContent = '.skintone-button-wrapper { display: none !important; }';
    picker.shadowRoot?.appendChild(style);

    // Emoji buttons are options while searching, and menu items otherwise.
    const onbuttonclick = (event: Event) => {
      const button = event
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && ['option', 'menuitem'].includes(node.getAttribute('role')!));
      clicked = button?.getBoundingClientRect() ?? null;
    };
    const onemojiclick = (event: Event) => {
      const { unicode, emoji } = (event as CustomEvent).detail;
      const skins: { unicode: string }[] = emoji.skins ?? [];
      if (skins.length > 0 && clicked) {
        toned = { name: emoji.annotation, options: [emoji.unicode, ...skins.map((skin) => skin.unicode)], ...place(clicked) };
      } else {
        onpick(unicode);
      }
    };
    // Scrolling would leave the popup behind its emoji.
    const onwheel = () => (toned = null);
    picker.addEventListener('click', onbuttonclick, true);
    picker.addEventListener('emoji-click', onemojiclick);
    picker.addEventListener('wheel', onwheel, { passive: true });
    return () => {
      picker.removeEventListener('click', onbuttonclick, true);
      picker.removeEventListener('emoji-click', onemojiclick);
      picker.removeEventListener('wheel', onwheel);
    };
  };

  // Any emoji, from every group but 2, which holds the skin tone swatches on their own.
  async function random() {
    const groups = [0, 1, 3, 4, 5, 6, 7, 8, 9];
    const emoji = await new Database({ dataSource }).getEmojiByGroup(groups[Math.floor(Math.random() * groups.length)]!);
    const one = emoji[Math.floor(Math.random() * emoji.length)];
    if (one && 'unicode' in one) onpick(one.unicode);
  }

  const focus = (button: HTMLButtonElement) => button.focus();
</script>

<div class="picker" bind:this={wrap}>
  <div class="bar">
    <button type="button" onclick={random}>Random</button>
    <button type="button" onclick={() => onpick(null)}>No icon</button>
  </div>
  <emoji-picker class={light ? 'light' : 'dark'} data-source={dataSource} {@attach setUp}></emoji-picker>
  {#if toned}
    <!-- The listener catches Escape from the buttons inside, which are interactive. -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="tones"
      role="group"
      aria-label="Skin tone for {toned.name}"
      style:top="{toned.top}px"
      style:left="{toned.left}px"
      {@attach outside(() => (toned = null))}
      onkeydown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          toned = null;
        }
      }}
    >
      {#each toned.options as option, i (option)}
        {#if i === 0}
          <button type="button" aria-label={option} onclick={() => onpick(option)} {@attach focus}>{option}</button>
        {:else}
          <button type="button" aria-label={option} onclick={() => onpick(option)}>{option}</button>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .picker {
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .bar {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
    padding: 0 2px 6px;
  }
  .bar button {
    height: 24px;
    padding: 0 8px;
    border-radius: 5px;
    color: var(--muted);
    font-size: 12px;
  }
  .bar button:hover {
    background: var(--row-hover);
    color: var(--fg);
  }
  /* A small popup under the emoji it's for. */
  .tones {
    position: absolute;
    z-index: 1;
    display: flex;
    gap: 2px;
    padding: 5px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    box-shadow: 0 8px 24px #0008;
  }
  .tones button {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    font-size: 20px;
  }
  .tones button:hover,
  .tones button:focus-visible {
    background: var(--row-hover);
  }
  /* The picker's own variables, set from the theme. */
  emoji-picker {
    --background: var(--card);
    --border-size: 0;
    --button-active-background: var(--row-hover);
    --button-hover-background: var(--row);
    --category-font-color: var(--muted);
    --category-font-size: 11px;
    --indicator-color: var(--accent);
    --input-border-color: var(--border);
    --input-border-radius: 6px;
    --input-font-color: var(--fg);
    --input-font-size: 13px;
    --input-placeholder-color: var(--muted);
    --outline-color: var(--accent);
    --emoji-size: 1.25rem;
    --emoji-padding: 0.35rem;
    --num-columns: 8;
    width: 100%;
    height: 300px;
  }
</style>
