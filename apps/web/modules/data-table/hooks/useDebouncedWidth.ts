"use client";

import debounce from "lodash/debounce";
import { useEffect, useState } from "react";

// Safari doesn't reliably re-run flex layout for a child sized off wrapped-text content
// purely from a container resize - the cached intrinsic size of deeply nested flex items
// survives an ordinary layout pass, so a lighter nudge (toggling transform, reading
// offsetHeight) isn't enough. A display:none/restore cycle is - it fully tears down and
// rebuilds the subtree's layout tree, so no cached size can survive it. Deferred to the
// next frame so it doesn't run synchronously inside the ResizeObserver callback that's
// watching this same subtree's ancestor (avoids "ResizeObserver loop" reentrancy) and so
// the browser never actually paints the momentarily-collapsed state. Other browsers
// recompute correctly on resize alone, so this is intentionally scoped to Safari only.
const isSafari =
  typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

function nudgeSafariRelayout(container: HTMLElement) {
  const table = container.querySelector<HTMLElement>(".data-table");
  if (!table) return;

  requestAnimationFrame(() => {
    const previousDisplay = table.style.display;
    table.style.display = "none";
    void table.offsetHeight; // force the removal to actually take effect before restoring
    table.style.display = previousDisplay;
  });
}

export function useDebouncedWidth(ref: React.RefObject<HTMLDivElement>, debounceMs = 100) {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    setWidth(element.clientWidth);

    const debouncedSetWidth = debounce((width: number) => {
      setWidth(width);
    }, debounceMs);

    const resizeObserver = new ResizeObserver(([entry]) => {
      debouncedSetWidth(entry.target.clientWidth);
      // Not debounced - needs to fire on every resize tick, not just once it settles,
      // or rows stay stuck at their narrow-viewport height until something else forces
      // a relayout (e.g. navigating away and back).
      if (isSafari) nudgeSafariRelayout(entry.target as HTMLElement);
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
      debouncedSetWidth.cancel();
    };
  }, [ref]);

  return width;
}
