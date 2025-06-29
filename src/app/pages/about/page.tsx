'use client';

import { getMountainAbout, getMountainTheme } from '@/utils/config';
import { useAboutPhoto } from '@/hooks/useAboutPhoto';
import Image from 'next/image';

export default function About() {
  const aboutConfig = getMountainAbout();
  const theme = getMountainTheme();
  const { photoUrl, loading: photoLoading, error: photoError } = useAboutPhoto(
    aboutConfig.mainPhoto?.filename || ''
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="prose prose-lg mx-auto">
        {/* Page Title */}
        <h1
          className="text-4xl font-bold mb-4"
          style={{ color: theme.primaryColor }}
        >
          {aboutConfig.title}
        </h1>

        {/* Subtitle */}
        {/* {aboutConfig.subtitle && (
          <p
            className="text-xl mb-6"
            style={{ color: theme.secondaryColor }}
          >
            {aboutConfig.subtitle}
          </p>
        )} */}

        {/* Main Photo */}
        {aboutConfig.mainPhoto && (
          <div className="mb-8">
            {photoLoading && (
              <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Loading photo...</span>
              </div>
            )}
            {photoError && (
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400">Photo unavailable</span>
              </div>
            )}
            {photoUrl && !photoLoading && (
              <figure className="mb-6">
                <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden">
                  <Image
                    src={photoUrl}
                    alt={aboutConfig.mainPhoto.altText}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                {aboutConfig.mainPhoto.caption && (
                  <figcaption className="text-center text-sm text-gray-600 mt-2 italic">
                    {aboutConfig.mainPhoto.caption}
                  </figcaption>
                )}
              </figure>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="text-lg mb-8 leading-relaxed">
          <p>{aboutConfig.mainContent}</p>
        </div>

        {/* Dynamic Sections */}
        {/* {aboutConfig.sections.map((section, index) => (
          <div key={index} className="mb-8">
            <h2
              className="text-2xl font-semibold mb-4"
              style={{ color: theme.primaryColor }}
            >
              {section.title}
            </h2>
            <p className="text-lg leading-relaxed">
              {section.content}
            </p>
          </div>
        ))} */}

      </div>
    </div>
  );
}

// This page now dynamically loads content based on the current mountain's configuration