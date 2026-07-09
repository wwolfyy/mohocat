'use client';

/**
 * Static north indicator pinned to the top-right of the map. The map plane never
 * rotates, but in a portrait viewport the image is rendered 90° CW, so north
 * points **right** there and the whole compass is rotated 90° CW to match
 * (`rotate-90`); in landscape north is up. Drawn as the classic compass needle (a
 * slim diamond, red north / light south) with a small "N", white + drop-shadow so
 * it reads over the satellite image without a bulky chip.
 *
 * z-[1100] sits above Leaflet's panes (z 200–700) and controls (z 1000):
 * `.leaflet-container` doesn't form a stacking context, so those z-indexes
 * bubble into this overlay's context (the P2-9 z-index reconciliation).
 */
export default function Compass({ portrait = false }: { portrait?: boolean }) {
  return (
    <div
      className={
        'absolute top-3 right-4 z-[1100] md:top-4 md:right-5 flex flex-col items-center leading-none select-none pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]' +
        (portrait ? ' rotate-90' : '')
      }
      role="img"
      aria-label={portrait ? '북쪽은 오른쪽입니다' : '북쪽은 위쪽입니다'}
      title={portrait ? '북쪽은 오른쪽' : '북쪽은 위쪽'}
    >
      {/* Counter-rotate the label in portrait so the letter stays upright while
          the needle (and the rest of the compass) is rotated to point right. */}
      <span className={'text-[11px] font-bold text-white' + (portrait ? ' -rotate-90' : '')}>
        N
      </span>
      <svg width="12" height="20" viewBox="0 0 12 20" className="-mt-0.5" aria-hidden="true">
        {/* north half (points up) — red, the universal compass convention */}
        <polygon points="6,0 10,11 2,11" fill="#ef4444" />
        {/* south half (points down) — light */}
        <polygon points="6,20 10,11 2,11" fill="#f3f4f6" />
      </svg>
    </div>
  );
}
