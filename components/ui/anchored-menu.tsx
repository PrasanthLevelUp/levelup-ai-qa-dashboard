'use client';

/**
 * AnchoredMenu
 * ============
 * A dropdown panel rendered in a portal (document.body) using fixed positioning
 * anchored to a trigger element. Rendering in a portal means the menu escapes
 * any ancestor `overflow` clipping (e.g. the GlobalContextBar's horizontal
 * scroll container) and any ancestor stacking context, so it always paints
 * above page content regardless of z-index nesting.
 *
 * Repositions on scroll/resize so it stays glued to the trigger.
 */

import { useEffect, useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';
import * as ReactDOM from 'react-dom';

interface AnchoredMenuProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement>;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: number;
  className?: string;
}

interface Coords { top: number; left: number; width: number }

export function AnchoredMenu({
  open,
  onClose,
  anchorRef,
  children,
  align = 'left',
  width = 256,
  className = '',
}: AnchoredMenuProps): ReactNode {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const el = anchorRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const w = Math.min(width, vw - 16);
      let left = align === 'right' ? r.right - w : r.left;
      // Keep within the viewport horizontally.
      left = Math.max(8, Math.min(left, vw - w - 8));
      setCoords({ top: r.bottom + 4, left, width: w });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, align, width, anchorRef]);

  if (!mounted || !open || !coords) return null;

  const menu = (
    <>
      <div className="fixed inset-0 z-[998]" onClick={onClose} />
      <div
        className={`fixed z-[999] bg-[#0f1729] border border-[#334155] rounded-lg shadow-2xl overflow-y-auto max-h-[70vh] ${className}`}
        style={{ top: coords.top, left: coords.left, width: coords.width }}
      >
        {children}
      </div>
    </>
  );

  // Cast to `any` to sidestep a duplicate @types/react version mismatch
  // (react-dom ships a nested copy) that otherwise breaks createPortal typing.
  return ReactDOM.createPortal(menu as any, document.body) as ReactNode;
}
