'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Shared layer stack for all overlays (modals, lightboxes, players).
 *
 * Every open overlay registers itself here while mounted, which drives three
 * things off a single source of truth — the order in which overlays were opened:
 *
 * 1. **Keyboard** — Escape / arrow handlers only fire for the **topmost** layer,
 *    so a single keypress acts on the overlay the user is actually looking at,
 *    never on the ones stacked beneath it.
 * 2. **Stacking** — each layer's `z-index` is derived from its depth in the
 *    stack, so a newly-opened overlay always sits above every overlay already
 *    open. This keeps nested overlays (e.g. an album opened from a cat modal
 *    that was itself opened from the map gallery) correctly ordered at any depth
 *    without a hand-maintained ladder of magic `z-index` values. Overlays that
 *    render into a portal (so they escape any ancestor stacking context) must
 *    apply the returned value for this to hold.
 * 3. **Back-button / swipe-back** — each layer pushes a synthetic history entry
 *    on open so the browser/OS back gesture closes the overlay rather than
 *    navigating away from the underlying page. The entry is popped on normal
 *    close (X button, backdrop) so the history stack stays clean. A layer that
 *    is worth addressing (a specific cat, say) can give that entry a `historyUrl`
 *    and become shareable/reloadable for free — see the option's doc below.
 */

const layerStack: string[] = [];

// Escape-handler map keyed by layer id, used by the global popstate handler to
// close the topmost overlay when the user presses the browser/OS back button.
const layerEscapeHandlers = new Map<string, () => void>();

// Guards against the programmatic history.back() call (issued when a modal is
// closed normally) triggering the popstate handler and inadvertently closing
// the modal below it.
let suppressNextPopState = false;
let popStateListenerRegistered = false;

function onGlobalPopState() {
  if (suppressNextPopState) {
    suppressNextPopState = false;
    return;
  }
  if (layerStack.length === 0) return;
  const topId = layerStack[layerStack.length - 1];
  layerEscapeHandlers.get(topId)?.();
}

// The first overlay sits at BASE; each nested layer sits STEP above the one
// below it. Kept in JS rather than a fixed set of Tailwind `z-*` utilities so
// arbitrary nesting depths stack correctly.
const BASE_Z_INDEX = 50;
const Z_INDEX_STEP = 10;

interface LayerHandlers {
  onEscape?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  /**
   * Optional URL to put on this layer's synthetic history entry (e.g.
   * `/pages/cats?cat=<id>`), which makes the overlay shareable and survive a
   * reload without any extra history bookkeeping: the entry this hook already
   * pushes carries the URL, and the `history.back()` it already issues on close
   * restores the previous one.
   *
   * Omit it for overlays with nothing to address (lightboxes, players) — the
   * entry then keeps the current URL, which is the existing behaviour.
   *
   * Read once, when the entry is pushed; changing it on an open layer does
   * nothing (the layer would have to close and reopen to re-push).
   */
  historyUrl?: string;
}

/**
 * Registers an open overlay in the shared layer stack and returns the
 * `z-index` it should paint at (see the module doc). Returns the base z-index
 * while closed / before registration; the value settles on mount.
 */
export function useModalLayer(isOpen: boolean, handlers: LayerHandlers): number {
  const id = useId();
  // Keep the latest handlers without re-subscribing the listener each render.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [zIndex, setZIndex] = useState(BASE_Z_INDEX);

  useEffect(() => {
    if (!isOpen) return;

    // Register the global popstate listener once (client-only, lazy).
    if (!popStateListenerRegistered) {
      popStateListenerRegistered = true;
      window.addEventListener('popstate', onGlobalPopState);
    }

    layerStack.push(id);
    setZIndex(BASE_Z_INDEX + (layerStack.length - 1) * Z_INDEX_STEP);

    // Push a synthetic history entry so the browser/OS back button closes this
    // overlay instead of navigating away from the underlying page. When the
    // layer supplied a `historyUrl`, that entry also addresses the overlay, so
    // the URL is shareable and a reload reopens it.
    //
    // If the current URL is *already* the one this layer addresses — a forward
    // navigation back into the overlay — adopt that entry rather than pushing a
    // duplicate of it. Claiming it still lets the close path below pop back to
    // the page underneath, which a plain push would not: it would strand an
    // identical URL behind the overlay.
    const { historyUrl } = handlersRef.current;
    const isCurrentUrl =
      historyUrl != null && new URL(historyUrl, location.href).href === location.href;
    if (isCurrentUrl) {
      history.replaceState({ mohocat_modal: id }, '');
    } else {
      history.pushState({ mohocat_modal: id }, '', historyUrl);
    }

    // Register this layer's close callback for popstate dispatch.
    layerEscapeHandlers.set(id, () => handlersRef.current.onEscape?.());

    const onKeyDown = (e: KeyboardEvent) => {
      if (layerStack[layerStack.length - 1] !== id) return;
      const h = handlersRef.current;
      if (e.key === 'Escape' && h.onEscape) {
        h.onEscape();
      } else if (e.key === 'ArrowLeft' && h.onArrowLeft) {
        h.onArrowLeft();
      } else if (e.key === 'ArrowRight' && h.onArrowRight) {
        h.onArrowRight();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      layerEscapeHandlers.delete(id);
      const idx = layerStack.lastIndexOf(id);
      if (idx !== -1) layerStack.splice(idx, 1);

      // If history.state still points at our entry the overlay was closed
      // normally (X / backdrop), not by the back button — pop the synthetic
      // entry we pushed so the history stack stays clean. Suppress the
      // resulting popstate so it doesn't accidentally close the layer below.
      if ((history.state as { mohocat_modal?: string } | null)?.mohocat_modal === id) {
        suppressNextPopState = true;
        history.back();
      }
    };
  }, [isOpen, id]);

  return zIndex;
}
