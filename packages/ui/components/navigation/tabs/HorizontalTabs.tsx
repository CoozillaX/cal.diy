import { useIsomorphicLayoutEffect } from "@calcom/lib/hooks/useIsomorphicLayoutEffect";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../button";
import type { HorizontalTabItemProps } from "./HorizontalTabItem";
import HorizontalTabItem from "./HorizontalTabItem";

export interface NavTabProps {
  tabs: HorizontalTabItemProps[];
  linkShallow?: boolean;
  linkScroll?: boolean;
  actions?: JSX.Element;
  scrollActiveTabIntoView?: boolean;
}

const HorizontalTabs = ({
  tabs,
  linkShallow,
  linkScroll,
  actions,
  scrollActiveTabIntoView,
  ...props
}: NavTabProps): JSX.Element => {
  const navRef = useRef<HTMLElement | null>(null);
  const lastScrolledActiveHrefRef = useRef<string | null>(null);

  // Tab bars with a lot of tabs (e.g. one per team) can overflow the
  // viewport width. The row is scrollable (overflow-x-scroll) but its
  // scrollbar is deliberately hidden (no-scrollbar) for a cleaner look, so
  // without this, the only way to reach the hidden tabs is a trackpad swipe
  // or shift+wheel - both undiscoverable, and the second doesn't even exist
  // on most Windows mice. These left/right buttons give every input device
  // an explicit, visible way to reach the rest of the tabs.
  const [scrollState, setScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  const updateScrollState = useCallback((): void => {
    const navEl = navRef.current;
    if (!navEl) return;
    // A couple of px of slack avoids flicker from sub-pixel rounding.
    const hasOverflow = navEl.scrollWidth > navEl.clientWidth + 2;
    setScrollState({
      hasOverflow,
      canScrollLeft: hasOverflow && navEl.scrollLeft > 2,
      canScrollRight: hasOverflow && navEl.scrollLeft + navEl.clientWidth < navEl.scrollWidth - 2,
    });
  }, []);

  // tabs isn't read directly below, but its identity changing (e.g. more
  // teams loading in) must still trigger a re-measure - the ResizeObserver
  // alone can miss that, since navEl's own box (flex-1, overflow-x-scroll)
  // doesn't necessarily resize just because its children's content width did.
  // biome-ignore lint/correctness/useExhaustiveDependencies: tabs is an intentional re-run trigger (see comment above), not read in the effect body
  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    updateScrollState();

    navEl.addEventListener("scroll", updateScrollState, { passive: true });
    // Catches tabs being added/removed and window resizes alike, without
    // needing a separate window "resize" listener.
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(navEl);

    return () => {
      navEl.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [tabs, updateScrollState]);

  const scrollByDirection = (direction: 1 | -1): void => {
    const navEl = navRef.current;
    if (!navEl) return;
    navEl.scrollBy({ left: direction * navEl.clientWidth * 0.75, behavior: "smooth" });
  };

  useIsomorphicLayoutEffect(() => {
    if (!scrollActiveTabIntoView) return;
    const navEl = navRef.current;
    if (!navEl) return;

    if (navEl.scrollWidth <= navEl.clientWidth) return;

    const activeEl = navEl.querySelector<HTMLElement>("[aria-current='page']");
    if (!activeEl) return;

    const activeHref = activeEl.getAttribute("href");
    if (activeHref && lastScrolledActiveHrefRef.current === activeHref) return;

    activeEl.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "center",
    });
    if (activeHref) lastScrolledActiveHrefRef.current = activeHref;
  }, [scrollActiveTabIntoView, tabs]);

  return (
    <div className="mb-4 max-w-full lg:mb-5">
      <div className="flex min-w-0 items-center gap-1">
        {scrollState.hasOverflow && (
          <Button
            type="button"
            variant="icon"
            color="minimal"
            StartIcon="chevron-left"
            aria-label="Scroll tabs left"
            disabled={!scrollState.canScrollLeft}
            onClick={() => scrollByDirection(-1)}
            className="shrink-0"
          />
        )}
        <nav
          className="no-scrollbar flex min-w-0 flex-1 space-x-0.5 overflow-x-scroll rounded-md"
          aria-label="Tabs"
          ref={navRef}
          {...props}
        >
          {tabs.map((tab) => (
            <HorizontalTabItem
              {...tab}
              key={tab.href}
              linkShallow={linkShallow}
              linkScroll={linkScroll}
            />
          ))}
        </nav>
        {scrollState.hasOverflow && (
          <Button
            type="button"
            variant="icon"
            color="minimal"
            StartIcon="chevron-right"
            aria-label="Scroll tabs right"
            disabled={!scrollState.canScrollRight}
            onClick={() => scrollByDirection(1)}
            className="shrink-0"
          />
        )}
      </div>
      {actions && actions}
    </div>
  );
};

export default HorizontalTabs;
