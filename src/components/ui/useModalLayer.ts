'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Shared layer stack for all overlays (modals, lightboxes, players).
 *
 * Every open overlay registers itself here while mounted, which drives two
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
 */

const layerStack: string[] = [];

// The first overlay sits at BASE; each nested layer sits STEP above the one
// below it. Kept in JS rather than a fixed set of Tailwind `z-*` utilities so
// arbitrary nesting depths stack correctly.
const BASE_Z_INDEX = 50;
const Z_INDEX_STEP = 10;

interface LayerHandlers {
  onEscape?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
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
    layerStack.push(id);
    setZIndex(BASE_Z_INDEX + (layerStack.length - 1) * Z_INDEX_STEP);

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
      const idx = layerStack.lastIndexOf(id);
      if (idx !== -1) layerStack.splice(idx, 1);
    };
  }, [isOpen, id]);

  return zIndex;
}
