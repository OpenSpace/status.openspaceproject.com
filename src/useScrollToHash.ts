import { useEffect } from 'react';

/**
 * How long the target is kept in place while the content above it is still loading
 */
const SettleTimeMs = 5000;

/**
 * Events that signal that the user wants to move around the page on their own
 */
const UserScrollEvents = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;

/**
 * Scrolls to the element named by the URL fragment once `ready` becomes true. The browser
 * only does that on its own if the element exists when the page loads, but the sections
 * are only rendered after the usage data has arrived. While the charts above the target
 * are loaded and change their size, the target is kept in place until the user starts to
 * scroll themselves
 */
export function useScrollToHash(ready: boolean) {
  useEffect(() => {
    if (!ready) return;

    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id === '') return;
    const target = document.getElementById(id);
    if (target === null) return;

    const align = () => target.scrollIntoView({ behavior: 'instant', block: 'start' });
    align();

    const observer = new ResizeObserver(align);
    observer.observe(document.body);

    const stop = () => {
      observer.disconnect();
      clearTimeout(timeout);
      for (const event of UserScrollEvents) window.removeEventListener(event, stop);
    };
    const timeout = setTimeout(stop, SettleTimeMs);
    for (const event of UserScrollEvents) {
      window.addEventListener(event, stop, { passive: true });
    }
    return stop;
  }, [ready]);
}
