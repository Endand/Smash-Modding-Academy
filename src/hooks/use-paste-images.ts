"use client";

import { useEffect, useRef } from "react";
import { imagesFromClipboard } from "@/lib/uploads";

/**
 * Lets an element take a pasted image: a screen capture (Win+Shift+S,
 * Cmd+Ctrl+Shift+4) or "Copy image" from a browser, uploaded without being
 * saved as a file first.
 *
 * Put the returned ref on the element and mark it `data-paste-zone`. A paste
 * goes to the zone holding the focused element, or failing that, the zone
 * under the pointer. So several zones can share a page without one paste
 * landing twice, and "hover the spot, press Ctrl+V" works without a click.
 *
 * Only images are intercepted. Pasted text passes straight through, so a zone
 * containing text fields behaves normally for everything else.
 */
export function usePasteImages<T extends HTMLElement>(
  enabled: boolean,
  onImages: (files: File[]) => void
) {
  const ref = useRef<T | null>(null);
  // Latest callback, read at paste time, so the listener is not torn down and
  // re-added on every render.
  const handler = useRef(onImages);
  useEffect(() => {
    handler.current = onImages;
  });

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;

    let hovered = false;
    const enter = () => { hovered = true; };
    const leave = () => { hovered = false; };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);

    const onPaste = (e: ClipboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const focusedZone = active?.closest?.("[data-paste-zone]") ?? null;
      const mine = focusedZone ? focusedZone === el : hovered;
      if (!mine) return;
      const files = imagesFromClipboard(e.clipboardData);
      if (files.length === 0) return;
      e.preventDefault();
      handler.current(files);
    };
    document.addEventListener("paste", onPaste);

    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      document.removeEventListener("paste", onPaste);
    };
  }, [enabled]);

  return ref;
}
