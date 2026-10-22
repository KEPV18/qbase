import { useEffect, useState, type RefObject } from "react";

/**
 * Scroll-edge detection for sticky chrome.
 *
 * The design system is explicit that sticky chrome must not ship a
 * permanent 1px border:
 *
 *   "Scroll edge, not hard divider.  Under sticky chrome, don't ship a
 *    permanent 1px border.  Show the hairline/shadow only once content
 *    actually scrolls beneath."
 *
 * This hook returns `true` once the given element has been scrolled past
 * the threshold, so the caller can toggle a `.scrolled` class.  The
 * threshold is 8px, matching the spec's reference implementation.
 *
 * It listens on the SCROLLING CONTAINER, not the window, and not the
 * sticky header itself:
 *
 *   - The sticky header's own scroll position never changes — the page
 *     behind it does.  Measuring the header would always read 0.
 *   - The pages that use this hook (the ISO manual, the procedures list)
 *     scroll an INTERNAL container with `overflow-y-auto`, not the
 *     window, so a window listener would never fire on them.
 *
 * The listener is passive, so it never blocks scrolling, and it is
 * attached to the element the caller actually scrolls.
 */
export function useScrollEdge(
  ref: RefObject<HTMLElement | null>,
  threshold = 8,
): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      setScrolled(el.scrollTop > threshold);
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [ref, threshold]);

  return scrolled;
}
