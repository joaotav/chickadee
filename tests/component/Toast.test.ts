import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Toast from '@/components/Toast.svelte';

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows its message with an Undo button', async () => {
    const onundo = vi.fn();
    render(Toast, { message: 'Deleted “Repos”', onundo, ondismiss: () => {} });
    expect(screen.getByRole('status')).toHaveTextContent('Deleted “Repos”');
    await fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onundo).toHaveBeenCalledOnce();
  });

  it('shows OK instead of Undo without onundo, which dismisses it', async () => {
    const ondismiss = vi.fn();
    render(Toast, { message: 'Couldn’t restore “Repos”', ondismiss });
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(ondismiss).toHaveBeenCalledOnce();
  });

  it('dismisses itself after 10 seconds', () => {
    const ondismiss = vi.fn();
    render(Toast, { message: 'Deleted “Repos”', onundo: () => {}, ondismiss });
    vi.advanceTimersByTime(9999);
    expect(ondismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(ondismiss).toHaveBeenCalledOnce();
  });

  it('pauses its countdown while the pointer is over it', async () => {
    const ondismiss = vi.fn();
    render(Toast, { message: 'Deleted “Repos”', onundo: () => {}, ondismiss });
    vi.advanceTimersByTime(4000);
    await fireEvent.pointerMove(screen.getByRole('status'));
    vi.advanceTimersByTime(60_000);
    expect(ondismiss).not.toHaveBeenCalled();
    await fireEvent.pointerLeave(screen.getByRole('status'));
    vi.advanceTimersByTime(5999);
    expect(ondismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(ondismiss).toHaveBeenCalledOnce();
  });

  it('stops its countdown when removed early', () => {
    const ondismiss = vi.fn();
    const { unmount } = render(Toast, { message: 'Deleted “Repos”', onundo: () => {}, ondismiss });
    unmount();
    vi.advanceTimersByTime(10_000);
    expect(ondismiss).not.toHaveBeenCalled();
  });
});
