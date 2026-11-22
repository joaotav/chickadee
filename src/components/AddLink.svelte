<script lang="ts">
  import LinkForm from './LinkForm.svelte';

  let { onadd }: { onadd: (url: string, title: string) => void } = $props();

  let open = $state(false);
</script>

{#if open}
  <LinkForm
    submit="Add"
    onsave={(url, title) => {
      onadd(url, title);
      open = false;
    }}
    oncancel={() => (open = false)}
  />
{:else}
  <button class="add" onclick={() => (open = true)}>+ Add bookmark</button>
{/if}

<style>
  .add {
    width: 100%;
    height: var(--row-height);
    padding: 0 8px;
    border-radius: 6px;
    color: var(--muted);
    text-align: left;
  }
  .add:hover {
    background: var(--row);
    color: var(--fg);
  }
</style>
