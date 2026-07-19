'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import Modal from './Modal';
import Button from './Button';

/**
 * Promise-based replacement for window.alert()/confirm() on the shared Modal
 * system (complexity-retirement P6.1; CLAUDE.md: user-facing modals use
 * ui/Modal). `alert` resolves when 확인 is pressed; `confirm` resolves true on
 * 확인, false on 취소/close — so `await dialog.alert(...)` preserves the
 * blocking sequencing call sites relied on with the native dialogs.
 *
 * The owner renders `dialog.element` once; hooks that fire dialogs of their
 * own (e.g. the shared form hooks) return the element for their host form to
 * render.
 */

interface DialogState {
  mode: 'alert' | 'confirm';
  message: string;
  title?: string;
}

export interface DialogApi {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  element: ReactNode;
}

export function useDialog(): DialogApi {
  const [state, setState] = useState<DialogState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const open = useCallback((mode: DialogState['mode'], message: string, title?: string) => {
    return new Promise<boolean>((resolve) => {
      // A dialog opened over an unresolved one dismisses the older prompt.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({ mode, message, title });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setState(null);
    // Resolve only after React has committed the modal unmount: dialog
    // continuations often navigate (`await dialog.alert(...); router.push(...)`),
    // and an App-Router transition started while the unmount re-render is still
    // pending gets canceled by it (the push's RSC fetch fires but the URL never
    // commits). Deferring a task restores the native-alert timing shape.
    if (resolve) {
      setTimeout(() => resolve(result), 0);
    }
  }, []);

  const alertDialog = useCallback(
    (message: string, title?: string) => open('alert', message, title).then(() => undefined),
    [open]
  );

  const confirmDialog = useCallback(
    (message: string, title?: string) => open('confirm', message, title),
    [open]
  );

  const element = state ? (
    <Modal
      isOpen
      onClose={() => close(false)}
      title={state.title ?? (state.mode === 'confirm' ? '확인' : '알림')}
      size="sm"
    >
      <p className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700">
        {state.message}
      </p>
      <div className="mt-5 flex justify-end gap-2">
        {state.mode === 'confirm' && (
          <Button variant="secondary" size="sm" onClick={() => close(false)}>
            취소
          </Button>
        )}
        <Button size="sm" onClick={() => close(true)}>
          확인
        </Button>
      </div>
    </Modal>
  ) : null;

  return { alert: alertDialog, confirm: confirmDialog, element };
}
