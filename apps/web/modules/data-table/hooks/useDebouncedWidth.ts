"use client";

import debounce from "lodash/debounce";
import { useEffect, useState } from "react";

// Safari doesn't reliably re-run flex layout for a child sized off wrapped-text content
// (flex-basis driven by its own content) purely from a container resize - it needs an
// actual style mutation on an ancestor to invalidate the cached geometry. Other browsers
// recompute correctly on resize alone, so this is intentionally scoped to Safari only.
const isSafari =
  typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

function nudgeSafariRelayout(element: HTMLElement) {
  element.style.transform = "translateZ(0)";
  void element.offsetHeight; // flush layout with the mutation applied
  element.style.transform = "";
  void element.offsetHeight; // flush again so the revert is actually re-evaluated too
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
