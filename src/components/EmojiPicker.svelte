<script lang="ts">
  // PROTOTYPE for #64: every emoji, from emoji-picker-element, with its data shipped in the
  // extension so it never downloads it from a CDN.
  import 'emoji-picker-element';
  import { Database, type Picker } from 'emoji-picker-element';
  import dataSource from 'emoji-picker-element-data/en/emojibase/data.json?url';
  import { outside } from '@/lib/outside';

  let {
    onpick,
    extras = false,
  }: {
    /** The picked emoji, or null for no icon. */
    onpick: (emoji: string | null) => void;
    /** Variant D: Random and No icon above the picker, and skin tones only when an emoji has them. */
    extras?: boolean;
  } = $props();

  // The picker has a light and a dark look. Only Rosé Pine Dawn is light.
  const light = document.documentElement.dataset.theme === 'rose-pine-dawn';

  let picker = $state<Picker>();
  let wrap: HTMLElement;
  // An emoji with skin tones, waiting for one of them to be picked, and where its popup goes.
  let toned = $state<{ name: string; options: string[]; top: number; left: number } | null>(null);
  // The emoji button last clicked, inside the picker. Its click event comes before the
  // picker's emoji-click, which doesn't say which button it was.
  let clicked: DOMRect | null = null;
  const TONES_WIDTH = 6 * 34 + 10;
  const TONES_HEIGHT = 44;

  // Under the clicked emoji, or above it when there's no room below, kept inside the picker.
  function place(rect: DOMRect) {
    const box = wrap.getBoundingClientRect();
    const left = Math.min(Math.max(rect.left - box.left + rect.width / 2 - TONES_WIDTH / 2, 0), box.width - TONES_WIDTH);
    const below = rect.bottom - box.top + 4;
    const top = below + TONES_HEIGHT <= box.height ? below : rect.top - box.top - TONES_HEIGHT - 4;
    return { top, left };
  }

  const listen = (element: HTMLElement) => {
    picker = element as Picker;
    if (extras) {
      // The picker's own skin tone button sets one tone for every emoji. Tones are offered per
      // emoji instead.
      const style = document.createElement('style');
      style.textContent = '.skintone-button-wrapper { display: none !important; }';
      picker.shadowRoot!.appendChild(style);
    }
    const onbuttonclick = (event: Event) => {
      // Emoji buttons are options while searching and menu items otherwise.
      const button = event.composedPath().find((node) => node instanceof HTMLElement && ['option', 'menuitem'].includes(node.getAttribute('role')!));
      clicked = button ? (button as HTMLElement).getBoundingClientRect() : null;
    };
    const onclick = (event: Event) => {
      const { unicode, emoji } = (event as CustomEvent).detail;
      const skins: { unicode: string }[] | undefined = emoji.skins;
      if (extras && skins?.length && clicked) {
        toned = { name: emoji.annotation, options: [emoji.unicode, ...skins.map((skin) => skin.unicode)], ...place(clicked) };
      } else {
        onpick(unicode);
      }
    };
    // Scrolling would leave the popup behind its emoji.
    const onwheel = () => (toned = null);
    element.addEventListener('click', onbuttonclick, true);
    element.addEventListener('emoji-click', onclick);
    element.addEventListener('wheel', onwheel, { passive: true });
    return () => {
      element.removeEventListener('click', onbuttonclick, true);
      element.removeEventListener('emoji-click', onclick);
      element.removeEventListener('wheel', onwheel);
    };
  };

  // Any emoji but the skin tone swatches, in group 2.
  async function random() {
    const groups = [0, 1, 3, 4, 5, 6, 7, 8, 9];
    const emoji = await new Database({ dataSource }).getEmojiByGroup(groups[Math.floor(Math.random() * groups.length)]!);
    const one = emoji[Math.floor(Math.random() * emoji.length)]!;
    onpick('unicode' in one ? one.unicode : null);
  }
</script>

<div class="wrap" class:extras bind:this={wrap}>
  {#if extras}
    <div class="bar">
      <button type="button" onclick={random}>Random</button>
      <button type="button" onclick={() => onpick(null)}>No icon</button>
    </div>
  {/if}
  <emoji-picker class={light ? 'light' : 'dark'} data-source={dataSource} {@attach listen}></emoji-picker>
  {#if toned}
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
        <button type="button" aria-label={option} onclick={() => onpick(option)} {@attach (button) => void (i === 0 && button.focus())}
          >{option}</button
        >
      {/each}
    </div>
  {/if}
</div>

<style>
  .wrap {
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
  .tones button:hover {
    background: var(--row-hover);
  }
  /* The picker's own variables, set from the theme. */
  emoji-picker {
    --background: var(--card);
    --border-color: var(--border);
    --border-radius: 8px;
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
  .extras emoji-picker {
    --border-size: 0;
  }
</style>
