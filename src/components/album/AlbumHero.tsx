import { ReactNode } from 'react';

interface AlbumHeroProps {
  icon: ReactNode;
}

/**
 * Minimal album page header: just a brand→accent gradient icon chip (camera for
 * photos, film for videos) on a neutral white surface. Title and subtitle were
 * intentionally removed — the icon alone marks the page.
 */
export default function AlbumHero({ icon }: AlbumHeroProps) {
  return (
    <div className="bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-brand to-accent text-ink shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}
