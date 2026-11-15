import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countdown } from '@/lib/countdown';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('countdown', () => {
  it('calls back once the time is up', () => {
    const ondone = vi.fn();
    countdown(4000, ondone);
    vi.advanceTimersByTime(3999);
    expect(ondone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(ondone).toHaveBeenCalledOnce();
  });

  it('leaves out the time spent paused', () => {
    const ondone = vi.fn();
    const timer = countdown(4000, ondone);
    vi.advanceTimersByTime(1000);
    timer.pause();
    vi.advanceTimersByTime(60_000);
    expect(ondone).not.toHaveBeenCalled();
    timer.resume();
    vi.advanceTimersByTime(2999);
    expect(ondone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(ondone).toHaveBeenCalledOnce();
  });

  it('ignores pausing or resuming twice in a row', () => {
    const ondone = vi.fn();
    const timer = countdown(4000, ondone);
    vi.advanceTimersByTime(1000);
    timer.pause();
    vi.advanceTimersByTime(1000);
    timer.pause();
    timer.resume();
    timer.resume();
    vi.advanceTimersByTime(2999);
    expect(ondone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(ondone).toHaveBeenCalledOnce();
  });

  it('never calls back once stopped, even if resumed', () => {
    const ondone = vi.fn();
    const timer = countdown(4000, ondone);
    timer.stop();
    timer.resume();
    vi.advanceTimersByTime(10_000);
    expect(ondone).not.toHaveBeenCalled();
  });
});
