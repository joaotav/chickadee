<script lang="ts">
  // PROTOTYPE for #64: every emoji, from emoji-picker-element, with its data shipped in the
  // extension so it never downloads it from a CDN.
  import 'emoji-picker-element';
  import { Database, type Picker } from 'emoji-picker-element';
  import dataSource from 'emoji-picker-element-data/en/emojibase/data.json?url';

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
  // An emoji with skin tones, waiting for one of them to be picked.
  let toned = $state<{ name: string; options: string[] } | null>(null);

  const listen = (element: HTMLElement) => {
    picker = element as Picker;
    if (extras) {
      // The picker's own skin tone button sets one tone for every emoji. Tones are offered per
      // emoji instead.
      const style = document.createElement('style');
      style.textContent = '.skintone-button-wrapper { display: none !important; }';
      picker.shadowRoot!.appendChild(style);
    }
    const onclick = (event: Event) => {
      const { unicode, emoji } = (event as CustomEvent).detail;
      const skins: { unicode: string }[] | undefined = emoji.skins;
      if (extras && skins?.length) toned = { name: emoji.annotation, options: [emoji.unicode, ...skins.map((skin) => skin.unicode)] };
      else onpick(unicode);
    };
    element.addEventListener('emoji-click', onclick);
    return () => element.removeEventListener('emoji-click', onclick);
  };

  // Any emoji but the skin tone swatches, in group 2.
  async function random() {
    const groups = [0, 1, 3, 4, 5, 6, 7, 8, 9];
    const emoji = await new Database({ dataSource }).getEmojiByGroup(groups[Math.floor(Math.random() * groups.length)]!);
    const one = emoji[Math.floor(Math.random() * emoji.length)]!;
    onpick('unicode' in one ? one.unicode : null);
  }
</script>

<div class="wrap" class:extras>
  {#if extras}
    <div class="bar">
      <button type="button" onclick={random}>Random</button>
      <button type="button" onclick={() => onpick(null)}>No icon</button>
    </div>
  {/if}
  <emoji-picker class={light ? 'light' : 'dark'} data-source={dataSource} {@attach listen}></emoji-picker>
  {#if toned}
    <div class="tones" role="group" aria-label="Skin tone for {toned.name}">
      {#each toned.options as option (option)}
        <button type="button" aria-label={option} onclick={() => onpick(option)}>{option}</button>
      {/each}
      <button type="button" class="back" onclick={() => (toned = null)}>Back</button>
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
  /* Covers the picker's bottom row, where its recently used emoji are. */
  .tones {
    position: absolute;
    right: 1px;
    bottom: 1px;
    left: 1px;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px;
    border-top: 1px solid var(--border);
    border-radius: 0 0 8px 8px;
    background: var(--card);
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
  .tones .back {
    width: auto;
    margin-left: auto;
    padding: 0 8px;
    color: var(--muted);
    font-size: 12px;
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
