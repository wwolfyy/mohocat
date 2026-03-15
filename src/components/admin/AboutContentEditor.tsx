'use client';

import { useState, useEffect } from 'react';
import { getAboutContentService } from '@/services';
import { AboutContent } from '@/services/about-content-service';
import { getMountainAbout } from '@/utils/config';

export default function AboutContentEditor() {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const aboutContentService = getAboutContentService();

  useEffect(() => {
    loadAboutContent();
  }, []);

  const loadAboutContent = async () => {
    try {
      setLoading(true);
      setError(null);

      const firestoreContent = await aboutContentService.getAboutContent();

      if (firestoreContent) {
        setContent(firestoreContent);
      } else {
        // Initialize with current JSON config if no Firestore data exists
        const jsonConfig = getMountainAbout();
        const initialContent: AboutContent = {
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
            localPath: jsonConfig.mainPhoto?.localPath,
          },
          sections: jsonConfig.sections || [],
        };
        setContent(initialContent);
      }
    } catch (err) {
      console.error('Error loading about content:', err);
      setError('Failed to load about content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await aboutContentService.saveAboutContent(content, 'admin@example.com'); // TODO: Get actual user email

      setSuccess('About content saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving about content:', err);
      setError('Failed to save about content');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setContent((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleMainPhotoChange = (field: string, value: string) => {
    setContent((prev) =>
      prev
        ? {
            ...prev,
            mainPhoto: { ...prev.mainPhoto, [field]: value },
          }
        : null
    );
  };

  const handleSectionChange = (index: number, field: string, value: string) => {
    setContent((prev) => {
      if (!prev) return null;
      const newSections = [...prev.sections];
      newSections[index] = { ...newSections[index], [field]: value };
      return { ...prev, sections: newSections };
    });
  };

  const addSection = () => {
    setContent((prev) =>
      prev
        ? {
            ...prev,
            sections: [...prev.sections, { title: '', content: '' }],
          }
        : null
    );
  };

  const removeSection = (index: number) => {
    setContent((prev) => {
      if (!prev) return null;
      const newSections = prev.sections.filter((_, i) => i !== index);
      return { ...prev, sections: newSections };
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">About Content Management</h1>
          <p className="text-gray-600">No content found. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">About Content Management</h1>
        <p className="text-gray-600">Manage the content for your mountain&apos;s about page</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={content.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Subtitle */}
        <div>
          <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700 mb-2">
            Subtitle
          </label>
          <input
            id="subtitle"
            type="text"
            value={content.subtitle}
            onChange={(e) => handleInputChange('subtitle', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Main Content */}
        <div>
          <label htmlFor="mainContent" className="block text-sm font-medium text-gray-700 mb-2">
            Main Content
          </label>
          <textarea
            id="mainContent"
            value={content.mainContent}
            onChange={(e) => handleInputChange('mainContent', e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter the main content. Use \n for line breaks."
          />
          <div className="mt-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <p className="font-medium mb-1">💡 Link Support:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Markdown links:</strong> [링크텍스트](https://example.com)
              </li>
              <li>
                <strong>Auto-detection:</strong> URLs like https://example.com are automatically
                converted to links
              </li>
              <li>
                <strong>Cat modal links:</strong> [catmodal:아롱이] opens a modal for the cat named
                &quot;아롱이&quot;
              </li>
              <li>
                <strong>Line breaks:</strong> Press Enter for new lines
              </li>
            </ul>
          </div>
        </div>

        {/* Main Photo */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Main Photo</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-2">
                Filename
              </label>
              <input
                id="filename"
                type="text"
                value={content.mainPhoto.filename}
                onChange={(e) => handleMainPhotoChange('filename', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="altText" className="block text-sm font-medium text-gray-700 mb-2">
                Alt Text
              </label>
              <input
                id="altText"
                type="text"
                value={content.mainPhoto.altText}
                onChange={(e) => handleMainPhotoChange('altText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
              Caption
            </label>
            <textarea
              id="caption"
              value={content.mainPhoto.caption}
              onChange={(e) => handleMainPhotoChange('caption', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sections */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Sections</h3>
            <button
              onClick={addSection}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add Section
            </button>
          </div>

          {content.sections.map((section, index) => (
            <div key={index} className="mb-6 p-4 border border-gray-100 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-md font-medium text-gray-800">Section {index + 1}</h4>
                <button
                  onClick={() => removeSection(index)}
                  className="text-red-600 hover:text-red-800 focus:outline-none"
                >
                  Remove
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor={`section-title-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Title
                  </label>
                  <input
                    id={`section-title-${index}`}
                    type="text"
                    value={section.title}
                    onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`section-content-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Content
                  </label>
                  <textarea
                    id={`section-content-${index}`}
                    value={section.content}
                    onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Section content supports [links](https://example.com) and auto-detection of URLs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
