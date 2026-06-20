'use client';

import { useEffect, useId, useRef } from 'react';

/**
 * Shared keyboard-layer stack for all overlays (modals, lightboxes, players).
 *
 * Every open overlay registers itself here while mounted. Keyboard handlers
 * (Escape / arrows) only fire for the **topmost** layer, so a single keypress
 * acts on the overlay the user is actually looking at — never on the ones
 * stacked beneath it. This replaces ad-hoc per-overlay `keydown` listeners that
 * would otherwise all fire at once.
 */

const layerStack: string[] = [];

interface LayerHandlers {
  onEscape?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

export function useModalLayer(isOpen: boolean, handlers: LayerHandlers): void {
  const id = useId();
  // Keep the latest handlers without re-subscribing the listener each render.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!isOpen) return;
    layerStack.push(id);

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
}
