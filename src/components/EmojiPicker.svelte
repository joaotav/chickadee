<script lang="ts">
  // PROTOTYPE for #64: every emoji, from emoji-picker-element, with its data shipped in the
  // extension so it never downloads it from a CDN.
  import 'emoji-picker-element';
  import dataSource from 'emoji-picker-element-data/en/emojibase/data.json?url';

  let { onpick }: { onpick: (emoji: string) => void } = $props();

  // The picker has a light and a dark look. Only Rosé Pine Dawn is light.
  const light = document.documentElement.dataset.theme === 'rose-pine-dawn';

  const listen = (picker: HTMLElement) => {
    const onclick = (event: Event) => onpick((event as CustomEvent<{ unicode: string }>).detail.unicode);
    picker.addEventListener('emoji-click', onclick);
    return () => picker.removeEventListener('emoji-click', onclick);
  };
</script>

<emoji-picker class={light ? 'light' : 'dark'} data-source={dataSource} {@attach listen}></emoji-picker>

<style>
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
</style>
