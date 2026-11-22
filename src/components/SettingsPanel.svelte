<script lang="ts" module>
  /** Asked before importing a file whose spaces are already here: the names here, and the import to run. */
  export interface ImportQuestion {
    taken: string[];
    run: (mode: 'merge' | 'separate') => void;
  }
</script>

<script lang="ts">
  import { pickFile } from '@/lib/files';
  import { OPTIONS, type Settings } from '@/lib/settings';

  let {
    settings,
    onchange,
    onexport,
    onimport,
  }: {
    settings: Settings;
    onchange: (settings: Settings) => void;
    /** Saves the Workspace as a bookmarks file. */
    onexport: () => void;
    /** Imports a bookmarks file, or returns a question to ask first. */
    onimport: (html: string) => ImportQuestion | undefined;
  } = $props();

  const GROUPS: { key: keyof Settings; label: string }[] = [
    { key: 'layout', label: 'Layout' },
    { key: 'theme', label: 'Theme' },
    { key: 'density', label: 'Density' },
    { key: 'titles', label: 'Titles' },
    { key: 'sizing', label: 'Card sizing' },
  ];

  let open = $state(false);
  let root: HTMLElement;
  let toggleButton: HTMLButtonElement;
  let question = $state<ImportQuestion | null>(null);

  $effect(() => {
    if (!open) question = null;
  });

  async function importFile() {
    const html = await pickFile();
    if (html === null) return;
    question = onimport(html) ?? null;
    if (!question) close();
  }

  function answer(mode: 'merge' | 'separate') {
    const { run } = question!;
    close();
    run(mode);
  }

  // “Work”, “Work” and “Home”, or “Work”, “Home” and 3 more.
  function names(list: string[]) {
    const quoted = list.map((name) => `“${name}”`);
    if (quoted.length === 1) return quoted[0];
    if (quoted.length === 2) return `${quoted[0]} and ${quoted[1]}`;
    return `${quoted[0]}, ${quoted[1]} and ${quoted.length - 2} more`;
  }

  const focus = (button: HTMLButtonElement) => button.focus();

  function choose(key: keyof Settings, value: string) {
    onchange({ ...settings, [key]: value });
  }

  function close() {
    open = false;
    toggleButton.focus();
  }

  // A click anywhere outside the panel closes it.
  function onWindowClick(event: MouseEvent) {
    if (open && !root.contains(event.target as Node)) open = false;
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') close();
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="settings" bind:this={root}>
  <button
    class="toggle"
    aria-label="Settings"
    aria-expanded={open}
    aria-controls="settings-panel"
    bind:this={toggleButton}
    onclick={() => (open = !open)}
  >
    <!-- The gear from Lucide's "settings" icon, https://lucide.dev, ISC license. -->
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  </button>
  {#if open}
    <div id="settings-panel" class="panel" role="dialog" aria-label="Settings">
      {#each GROUPS as group (group.key)}
        <fieldset>
          <legend>{group.label}</legend>
          <div class="options">
            {#each Object.entries(OPTIONS[group.key]) as [value, label] (value)}
              <label>
                <input
                  type="radio"
                  name={group.key}
                  {value}
                  checked={settings[group.key] === value}
                  onchange={() => choose(group.key, value)}
                />
                {label}
              </label>
            {/each}
          </div>
        </fieldset>
      {/each}
      <section aria-labelledby="bookmarks-heading">
        <h3 id="bookmarks-heading" class="legend">Bookmarks</h3>
        {#if question}
          <div class="question" role="group" aria-label="Import">
            <strong>Merge the file's spaces into yours?</strong>
            <span class="detail">
              {names(question.taken)}
              {question.taken.length === 1 ? 'is' : 'are'} already here. Keep separate adds them with a number, like “{question.taken[0]} (2)”.
            </span>
            <div class="answers">
              <button class="primary" onclick={() => answer('merge')} {@attach focus}>Merge</button>
              <button onclick={() => answer('separate')}>Keep separate</button>
              <button onclick={() => (question = null)}>Cancel</button>
            </div>
          </div>
        {:else}
          <div class="files">
            <button onclick={onexport}>Export</button>
            <button onclick={importFile}>Import…</button>
          </div>
          <p class="note">Your spaces, categories and links, as a bookmarks file that browsers and other tools can import.</p>
        {/if}
      </section>
      {#if import.meta.env.DEV}
        <!-- Development builds only. Loaded on demand, so releases leave the samples out. -->
        <div class="samples">
          <button class="sample" onclick={async () => (await import('@/lib/sample')).addSample('few')}>
            Add a few bookmarks
          </button>
          <button class="sample" onclick={async () => (await import('@/lib/sample')).addSample('many')}>
            Add many bookmarks
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .settings {
    position: relative;
  }
  .toggle {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    color: var(--muted);
  }
  .toggle:hover,
  .toggle[aria-expanded='true'] {
    background: var(--row-hover);
    color: var(--fg);
  }
  svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 300px;
    /* Scrolls in a window too short for all of it. */
    max-height: calc(100vh - 70px);
    overflow-y: auto;
    padding: 14px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    box-shadow: 0 12px 32px #0006;
  }
  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
  }
  legend,
  .legend {
    margin: 0 0 6px;
    padding: 0;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  /* Each option is a pill. The radio button is invisible and covers the pill, so it gets the clicks and the focus. */
  label {
    position: relative;
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: 7px;
    color: var(--muted);
    cursor: pointer;
  }
  label:hover {
    color: var(--fg);
  }
  label:has(:checked) {
    border-color: var(--accent);
    background: var(--row);
    color: var(--fg);
  }
  label:has(:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .files {
    display: flex;
    gap: 6px;
  }
  .files button {
    padding: 5px 12px;
    border: 1px solid var(--border);
    border-radius: 7px;
    color: var(--muted);
  }
  .files button:hover {
    background: var(--row);
    color: var(--fg);
  }
  .note {
    margin: 6px 0 0;
    color: var(--muted);
    font-size: 12px;
  }
  /* Like the questions on cards: a heading and the detail under it, then the buttons. */
  .question {
    display: flex;
    flex-direction: column;
    padding: 8px 8px 8px 10px;
    border: 1px solid var(--accent);
    border-radius: 8px;
    line-height: 1.4;
  }
  .question strong {
    font-weight: 600;
  }
  .question .detail {
    margin-top: 2px;
    color: var(--muted);
    font-size: 12px;
  }
  .answers {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 8px;
  }
  .answers button {
    height: 26px;
    padding: 0 10px;
    border-radius: 6px;
    color: var(--muted);
  }
  .answers button:hover {
    background: var(--row-hover);
    color: var(--fg);
  }
  .answers .primary {
    background: var(--accent-fill);
    color: var(--bg);
    font-weight: 600;
  }
  .answers .primary:hover {
    background: var(--accent-fill);
    color: var(--bg);
    filter: brightness(1.1);
  }
  .samples {
    display: flex;
    gap: 6px;
  }
  .sample {
    flex: 1;
    padding: 5px 10px;
    border: 1px dashed var(--border);
    border-radius: 7px;
    color: var(--muted);
  }
  .sample:hover {
    color: var(--fg);
  }
  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
</style>
