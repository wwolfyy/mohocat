'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { Point } from '@/types';
import { adminStrings } from '@/constants/adminStrings';

// The desktop/landscape map still — the authoring surface for pin positions.
// (Mobile renders a 90°-rotated copy; positions are stored device-independently
// as % of this landscape image, so authoring here is correct for both.)
const MAP_IMAGE = { url: '/images/screenshot_mt_geyang_50.png', width: 1616, height: 808 };

interface Coords {
  x: number; // percent across the image (0–100)
  y: number; // percent down the image (0–100)
}

interface PointMapPickerProps {
  /** All points, drawn as context dots (the one being edited is excluded). */
  points: Point[];
  /** Current position of the edited pin, or null until first placed. */
  value: Coords | null;
  /** Id of the point being edited, so it isn't also drawn as a context dot. */
  editingId?: string;
  onChange: (next: Coords) => void;
}

// Clamp to the image (0–100%) and round to 0.1% (~1.6px on the 1616px-wide
// image) so the map marker and the numeric inputs always show the same value.
const clampRound = (n: number) => Math.min(100, Math.max(0, Math.round(n * 10) / 10));

/**
 * Leaflet-free position picker for the 급식소 admin form. Renders the landscape
 * map image; click anywhere (or drag the highlighted marker) to set the edited
 * pin's `{x,y}` as a percentage of the image. Existing points are shown as
 * non-interactive context dots so an operator can place a pin relative to its
 * neighbours. Controlled input — no service calls.
 */
export default function PointMapPicker({
  points,
  value,
  editingId,
  onChange,
}: PointMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const setFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      onChange({
        x: clampRound(((clientX - rect.left) / rect.width) * 100),
        y: clampRound(((clientY - rect.top) / rect.height) * 100),
      });
    },
    [onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDragging(true);
    setFromEvent(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setFromEvent(e.clientX, e.clientY);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    const el = e.currentTarget as HTMLDivElement;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  const contextPoints = points.filter((p) => p.id !== editingId);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">{adminStrings.points.picker.hint}</p>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative w-full overflow-hidden rounded-lg border border-gray-300 cursor-crosshair select-none touch-none"
        style={{ aspectRatio: `${MAP_IMAGE.width} / ${MAP_IMAGE.height}` }}
      >
        <Image
          src={MAP_IMAGE.url}
          alt={adminStrings.points.picker.label}
          fill
          sizes="(max-width: 768px) 100vw, 700px"
          className="object-cover pointer-events-none"
          draggable={false}
          priority
        />

        {/* Context dots for the other points. */}
        {contextPoints.map((p) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-white/80 ring-2 ring-gray-500 shadow" />
            <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded bg-black/55 px-1 text-[10px] leading-4 text-white">
              {p.title}
            </span>
          </div>
        ))}

        {/* The edited pin. */}
        {value && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${value.x}%`, top: `${value.y}%` }}
          >
            <div className="h-4 w-4 rounded-full border-2 border-white bg-brand shadow-lg ring-2 ring-brand/60" />
          </div>
        )}
      </div>

      {/* Direct numeric entry — kept in two-way sync with the map marker. Typing
          one coordinate when none is set yet centers the other (50%). */}
      <div className="flex flex-wrap items-end gap-4">
        <CoordInput
          label={adminStrings.points.picker.xLabel}
          value={value?.x ?? null}
          onChange={(x) => onChange({ x, y: value?.y ?? 50 })}
        />
        <CoordInput
          label={adminStrings.points.picker.yLabel}
          value={value?.y ?? null}
          onChange={(y) => onChange({ x: value?.x ?? 50, y })}
        />
      </div>
    </div>
  );
}

/**
 * A 0–100 (%) number field for one coordinate.
 *
 * Holds its own draft **text** so the field shows exactly what the user types.
 * Binding the input straight to the parent's number reformats it on every
 * keystroke, which snaps the caret to the end and makes any edit except the last
 * character impossible — so we only re-sync from the prop when it changes from an
 * outside source (a map click/drag), and normalize the text on blur.
 */
function CoordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));

  // Re-sync when the prop changes from outside (map click/drag / loading a point
  // to edit). Skip when the prop already equals what's typed, so committing a
  // keystroke doesn't overwrite the in-progress text (and move the caret).
  useEffect(() => {
    const typed = text.trim() === '' ? null : clampRound(parseFloat(text));
    if (value !== typed) setText(value === null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="text-sm text-gray-700">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        step={0.1}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim() === '') return;
          const n = parseFloat(e.target.value);
          if (Number.isNaN(n)) return;
          onChange(clampRound(n));
        }}
        onBlur={() => setText(value === null ? '' : String(value))}
        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
    </label>
  );
}
