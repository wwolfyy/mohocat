"use client";

import { useState, useEffect, useRef } from "react";
import { getMountainAbout, getMountainTheme } from "@/utils/config";
import { useAboutPhoto } from "@/hooks/useAboutPhoto";
import { getAboutContentService, getCatService } from "@/services";
import { AboutContent } from "@/services/about-content-service";
import { processTextWithLinks } from "@/utils/text-processing";
import { Cat } from "@/types";
import { XMarkIcon } from "@heroicons/react/24/outline";
import CatInfo from "@/components/CatInfo";
import { cn } from "@/utils/cn";
import Image from "next/image";

export default function About() {
  const [aboutData, setAboutData] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [catModalLoading, setCatModalLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const aboutContentService = getAboutContentService();
  const catService = getCatService();
  const theme = getMountainTheme();

  // Load about content from Firestore or fallback to JSON
  useEffect(() => {
    const loadAboutContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const firestoreContent = await aboutContentService.getAboutContent();

        if (firestoreContent) {
          setAboutData(firestoreContent);
        } else {
          // Fallback to JSON config
          const jsonConfig = getMountainAbout();
          const fallbackContent: AboutContent = {
            title: jsonConfig.title,
            subtitle: jsonConfig.subtitle,
            mainContent: Array.isArray(jsonConfig.mainContent)
              ? jsonConfig.mainContent.join('')
              : jsonConfig.mainContent,
            mainPhoto: {
              filename: jsonConfig.mainPhoto?.filename || '',
              caption: Array.isArray(jsonConfig.mainPhoto?.caption)
                ? jsonConfig.mainPhoto.caption.join('')
                : jsonConfig.mainPhoto?.caption || '',
              altText: jsonConfig.mainPhoto?.altText || '',
              localPath: jsonConfig.mainPhoto?.localPath
            },
            sections: jsonConfig.sections || []
          };
          setAboutData(fallbackContent);
        }
      } catch (err) {
        console.error('Error loading about content:', err);
        setError('Failed to load about content');

        // Fallback to JSON config on error
        const jsonConfig = getMountainAbout();
        const fallbackContent: AboutContent = {
          title: jsonConfig.title,
          subtitle: jsonConfig.subtitle,
          mainContent: Array.isArray(jsonConfig.mainContent)
            ? jsonConfig.mainContent.join('')
            : jsonConfig.mainContent,
          mainPhoto: {
            filename: jsonConfig.mainPhoto?.filename || '',
            caption: Array.isArray(jsonConfig.mainPhoto?.caption)
              ? jsonConfig.mainPhoto.caption.join('')
              : jsonConfig.mainPhoto?.caption || '',
            altText: jsonConfig.mainPhoto?.altText || '',
            localPath: jsonConfig.mainPhoto?.localPath
          },
          sections: jsonConfig.sections || []
        };
        setAboutData(fallbackContent);
      } finally {
        setLoading(false);
      }
    };

    loadAboutContent();
  }, []);

  // Handle cat modal link clicks
  useEffect(() => {
    const handleCatModalClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('cat-modal-link')) {
        const catName = target.getAttribute('data-cat-name');
        if (catName) {
          setCatModalLoading(true);
          try {
            const cat = await catService.getCatByName(catName);
            if (cat) {
              setSelectedCat(cat);
            } else {
              console.warn(`Cat not found: ${catName}`);
              // Could show a toast or alert here
            }
          } catch (error) {
            console.error('Error loading cat:', error);
          } finally {
            setCatModalLoading(false);
          }
        }
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('click', handleCatModalClick);
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('click', handleCatModalClick);
      }
    };
  }, [aboutData, catService]);

  const {
    photoUrl,
    loading: photoLoading,
    error: photoError,
  } = useAboutPhoto(aboutData?.mainPhoto?.filename || "");

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!aboutData) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">About</h1>
          <p className="text-gray-600">Content not available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8"
      data-oid="3kim:bs"
    >
      <div className="prose prose-lg mx-auto" data-oid="your4.g">
        {/* Page Title */}
        <h1
          className="text-4xl font-bold mb-4"
          style={{ color: theme.primaryColor }}
          data-oid="5f.mun5"
        >
          {aboutData.title}
        </h1>

        {/* Subtitle */}
        {/* {aboutData.subtitle && (
          <p
            className="text-xl mb-6"
            style={{ color: theme.secondaryColor }}
          >
            {aboutData.subtitle}
          </p>
        )} */}

        {/* Main Photo */}
        {aboutData.mainPhoto && (
          <div className="mb-8" data-oid="fb83bh3">
            {photoLoading && (
              <div
                className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center"
                data-oid="zf9jc29"
              >
                <span className="text-gray-500" data-oid="2ba837f">
                  Loading photo...
                </span>
              </div>
            )}
            {photoError && (
              <div
                className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center"
                data-oid="5vdi5wj"
              >
                <span className="text-gray-400" data-oid="4b1u_oq">
                  Photo unavailable
                </span>
              </div>
            )}
            {photoUrl && !photoLoading && (
              <figure className="mb-6" data-oid="r08gnc2">
                <div
                  className="relative w-full h-96 md:h-[48rem] rounded-lg overflow-hidden"
                  data-oid="fq-5m32"
                >
                  <Image
                    src={photoUrl}
                    alt={aboutData.mainPhoto.altText}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    data-oid="vwu05tu"
                  />
                </div>
                {aboutData.mainPhoto.caption && (
                  <figcaption
                    className="text-center text-sm text-gray-600 mt-2 italic"
                    data-oid="9bbwzqo"
                  >
                    {aboutData.mainPhoto.caption}
                  </figcaption>
                )}
              </figure>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="text-lg mb-8 leading-relaxed" data-oid="9dy6r-_" ref={contentRef}>
          <div
            className="whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: processTextWithLinks(aboutData.mainContent) }}
          />
        </div>

        {/* Dynamic Sections */}
        {/* {aboutData.sections && aboutData.sections.length > 0 && (
          <div className="space-y-8">
            {aboutData.sections.map((section, index) => (
              <div key={index} className="mb-8">
                <h2
                  className="text-2xl font-semibold mb-4"
                  style={{ color: theme.primaryColor }}
                >
                  {section.title}
                </h2>
                <div
                  className="text-lg leading-relaxed whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: processTextWithLinks(section.content) }}
                />
              </div>
            ))}
          </div>
        )} */}
      </div>

      {/* Cat Modal */}
      {selectedCat && (
        <div
          className="fixed inset-0 bg-black/75 flex items-start justify-center z-50 overflow-y-auto py-4"
          onClick={() => setSelectedCat(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative my-auto min-h-fit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedCat(null)}
              className={cn(
                "absolute top-4 right-4 w-8 h-8 bg-red-500 hover:bg-red-600",
                "text-white rounded font-bold hover:shadow-lg transition-all duration-200",
                "flex items-center justify-center z-10"
              )}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <CatInfo cat={selectedCat} />
          </div>
        </div>
      )}

      {/* Cat Modal Loading */}
      {catModalLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
        </div>
      )}
    </div>
  );
}

// This page now dynamically loads content from Firestore with JSON fallback
