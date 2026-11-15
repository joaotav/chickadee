/**
 * Calls `ondone` once `ms` have passed, leaving out any time spent paused. Pausing while
 * paused, or resuming while running, does nothing. Once stopped, it never calls back.
 */
export function countdown(ms: number, ondone: () => void) {
  let remaining = ms;
  let started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(ondone, ms);
  let stopped = false;

  return {
    pause() {
      if (timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
      remaining -= Date.now() - started;
    },
    resume() {
      if (timer !== undefined || stopped) return;
      started = Date.now();
      timer = setTimeout(ondone, remaining);
    },
    stop() {
      clearTimeout(timer);
      timer = undefined;
      stopped = true;
    },
  };
}
