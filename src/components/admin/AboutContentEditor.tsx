'use client';

import { useState, useEffect } from 'react';
import { getAboutContentService } from '@/services';
import { AboutContent } from '@/services/about-content-service';
import { getMountainAbout } from '@/utils/config';
import { useMountain } from '@/components/MountainProvider';
import { adminStrings } from '@/constants/adminStrings';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

const { aboutEditor: t } = adminStrings;

export default function AboutContentEditor() {
  const mountainId = useMountain();
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
        const jsonConfig = getMountainAbout(mountainId);
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
      setError(t.loadFailed);
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

      setSuccess(t.saved);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving about content:', err);
      setError(t.saveFailed);
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.title}</h1>
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-brand" />
          <p className="text-gray-600">{t.notFound}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <div className="mt-2 h-1 w-12 rounded-full bg-brand" />
        <p className="text-gray-600 mt-2">{t.subtitle}</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            {t.fields.title}
          </label>
          <Input
            id="title"
            type="text"
            value={content.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
          />
        </div>

        {/* Subtitle */}
        <div>
          <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700 mb-2">
            {t.fields.subtitle}
          </label>
          <Input
            id="subtitle"
            type="text"
            value={content.subtitle}
            onChange={(e) => handleInputChange('subtitle', e.target.value)}
          />
        </div>

        {/* Main Content */}
        <div>
          <label htmlFor="mainContent" className="block text-sm font-medium text-gray-700 mb-2">
            {t.fields.mainContent}
          </label>
          <textarea
            id="mainContent"
            value={content.mainContent}
            onChange={(e) => handleInputChange('mainContent', e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
            placeholder={t.fields.mainContentPlaceholder}
          />
          <div className="mt-2 text-sm text-gray-600 bg-amber-50 p-3 rounded-md">
            <p className="font-medium mb-1">{t.linkHelp.heading}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>{t.linkHelp.markdownLabel}</strong>
                {t.linkHelp.markdownExample}
              </li>
              <li>
                <strong>{t.linkHelp.autoLabel}</strong>
                {t.linkHelp.autoExample}
              </li>
              <li>
                <strong>{t.linkHelp.catModalLabel}</strong>
                {t.linkHelp.catModalExample}
              </li>
              <li>
                <strong>{t.linkHelp.imageLabel}</strong>
                {t.linkHelp.imageExample}
              </li>
              <li>
                <strong>{t.linkHelp.videoLabel}</strong>
                {t.linkHelp.videoExample}
              </li>
              <li>
                <strong>{t.linkHelp.lineBreakLabel}</strong>
                {t.linkHelp.lineBreakExample}
              </li>
            </ul>
          </div>
        </div>

        {/* Main Photo */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t.fields.mainPhoto}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-2">
                {t.fields.filename}
              </label>
              <Input
                id="filename"
                type="text"
                value={content.mainPhoto.filename}
                onChange={(e) => handleMainPhotoChange('filename', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="altText" className="block text-sm font-medium text-gray-700 mb-2">
                {t.fields.altText}
              </label>
              <Input
                id="altText"
                type="text"
                value={content.mainPhoto.altText}
                onChange={(e) => handleMainPhotoChange('altText', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
              {t.fields.caption}
            </label>
            <textarea
              id="caption"
              value={content.mainPhoto.caption}
              onChange={(e) => handleMainPhotoChange('caption', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
            />
          </div>
        </div>

        {/* Sections */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">{t.fields.sections}</h3>
            <Button onClick={addSection} size="sm">
              {t.fields.addSection}
            </Button>
          </div>

          {content.sections.map((section, index) => (
            <div key={index} className="mb-6 p-4 border border-gray-100 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-md font-medium text-gray-800">
                  {t.fields.sectionTitle(index + 1)}
                </h4>
                <button
                  onClick={() => removeSection(index)}
                  className="text-sm font-medium text-red-600 hover:text-red-800 focus:outline-none"
                >
                  {t.fields.remove}
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor={`section-title-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t.fields.title}
                  </label>
                  <Input
                    id={`section-title-${index}`}
                    type="text"
                    value={section.title}
                    onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                  />
                </div>

                <div>
                  <label
                    htmlFor={`section-content-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {t.fields.mainContent}
                  </label>
                  <textarea
                    id={`section-content-${index}`}
                    value={section.content}
                    onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                    placeholder={t.fields.sectionContentPlaceholder}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? adminStrings.common.saving : adminStrings.common.saveChanges}
          </Button>
        </div>
      </div>
    </div>
  );
}
