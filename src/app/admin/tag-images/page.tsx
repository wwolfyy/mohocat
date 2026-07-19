'use client';

import { useCallback, useState } from 'react';
import { getImageService } from '@/services';
import { CatImage } from '@/types/media';
import { parseCreatedDateFromFilename } from '@/utils/dateParser';
import { parseDate } from '@/utils/parse-date';
import { adminStrings } from '@/constants/adminStrings';
import Button from '@/components/ui/Button';
import Lightbox from '@/components/ui/Lightbox';
import CatSelectorModal from '@/components/CatSelectorModal';
import {
  useMediaListController,
  useDateAutoParse,
  MediaStatsCards,
  MediaFilterBar,
  BatchActionsPanel,
  CatTagField,
  MediaGrid,
  PaginationBar,
} from '@/components/admin/media';

const { tagImages: t } = adminStrings;

interface AdminImage extends CatImage {
  // Additional admin-specific properties can be added here
  processingStatus?: 'parsing' | 'updating' | 'deleting' | null;
}

type ImageSortKey = 'created' | 'uploaded';

const sortDate = (image: AdminImage, sortBy: ImageSortKey): Date | null => {
  if (sortBy === 'created') {
    return image.createdTime ? parseDate(image.createdTime) : null;
  }
  return image.uploadDate ? new Date(image.uploadDate) : null;
};

export default function TagImagesPage() {
  // Service references
  const imageService = getImageService();

  // Read side: shared media-list controller (load/selection/filter/sort/pagination)
  const load = useCallback(async () => {
    const allImages = await imageService.getAllImages();
    return allImages.map((img) => ({ ...img, processingStatus: null }) as AdminImage);
  }, [imageService]);

  const c = useMediaListController<AdminImage, ImageSortKey>({
    load,
    loadErrorMessage: t.alerts.loadFailed,
    sortDate,
    defaultSortBy: 'uploaded',
  });

  // Edit-panel form states
  const [selectedImage, setSelectedImage] = useState<AdminImage | null>(null);
  const [tags, setTags] = useState<string>('');
  const [description, setDescription] = useState('');
  const [createdTime, setCreatedTime] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Batch operation states
  const [batchTags, setBatchTags] = useState<string>('');
  const [batchCreatedTime, setBatchCreatedTime] = useState<string>('');
  const [batchSaving, setBatchSaving] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  // Cat selector states (selection itself lives inside the shared CatSelectorModal)
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [catSelectorContext, setCatSelectorContext] = useState<'individual' | 'batch'>(
    'individual'
  );

  // Lightbox state
  const [showLightbox, setShowLightbox] = useState(false);

  // 자동 날짜 인식: shared loop machinery (filename date-source)
  const autoParse = useDateAutoParse<AdminImage>({
    items: c.items,
    setItems: c.setItems,
    needsDate: (image) => !image.createdTime,
    parse: (image) => parseCreatedDateFromFilename(image.fileName),
    label: (image) => image.fileName,
    applyUpdate: async (image, date) => {
      await imageService.updateImage(image.id, { createdTime: date });
    },
    mergeParsedDate: (image, date) => ({ ...image, createdTime: date }),
  });

  const selectImage = (image: AdminImage) => {
    setSelectedImage(image);
    setTags(image.tags?.join(', ') || '');
    setDescription(image.description || '');

    // Format createdTime for date input
    let createdTimeStr = '';
    if (image.createdTime) {
      try {
        const date = new Date(image.createdTime);
        if (!isNaN(date.getTime())) {
          // Convert to UTC+9 timezone (Korea Standard Time)
          const utcTime = date.getTime();
          const utcPlus9Time = new Date(utcTime + 9 * 60 * 60 * 1000);
          createdTimeStr = utcPlus9Time.toISOString().split('T')[0];
        }
      } catch (e) {
        console.warn('Error parsing createdTime:', image.createdTime);
      }
    }
    setCreatedTime(createdTimeStr);
  };

  const saveImageMetadata = async () => {
    if (!selectedImage) return;

    try {
      setSaving(true);

      const updateData: Partial<CatImage> = {
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        description: description,
        createdTime: createdTime ? new Date(createdTime) : undefined,
      };

      // Use service layer to update
      await imageService.updateImage(selectedImage.id, updateData);

      // Update local state
      const updatedImage = {
        ...selectedImage,
        ...updateData,
      };

      c.setItems(c.items.map((img) => (img.id === selectedImage.id ? updatedImage : img)));
      setSelectedImage(updatedImage);

      alert(t.alerts.saved);
    } catch (err: any) {
      console.error('Error saving metadata:', err);
      alert(t.alerts.saveFailed(err.message));
    } finally {
      setSaving(false);
    }
  };

  const deleteImageAndMetadata = async () => {
    if (!selectedImage) return;

    if (!confirm(t.alerts.deleteConfirm)) return;

    try {
      setSaving(true);

      // Use service layer to delete
      await imageService.deleteImage(selectedImage.id);

      // Update local state
      c.setItems(c.items.filter((img) => img.id !== selectedImage.id));
      setSelectedImage(null);

      alert(t.alerts.deleted);
    } catch (err: any) {
      console.error('Error deleting image:', err);
      alert(t.alerts.deleteFailed(err.message));
    } finally {
      setSaving(false);
    }
  };

  const batchUpdateTags = async () => {
    if (c.selectedIds.size === 0 || !batchTags.trim()) return;

    try {
      setSavingTags(true);
      const selectedImagesList = c.items.filter((img) => c.selectedIds.has(img.id));

      // Prepare batch updates for tags only
      const updates = selectedImagesList.map((image) => ({
        id: image.id,
        updates: {
          tags: Array.from(
            new Set([
              ...(image.tags || []),
              ...batchTags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            ])
          ),
        },
      }));

      // Use service layer for batch update
      await imageService.batchUpdateImages(updates);

      // Refresh images after batch update
      await c.reload();

      alert(t.alerts.tagsUpdated(selectedImagesList.length));
      setBatchTags(''); // Clear tags after successful update
    } catch (err: any) {
      console.error('Error batch updating tags:', err);
      alert(t.alerts.tagsUpdateFailed(err.message));
    } finally {
      setSavingTags(false);
    }
  };

  const batchUpdateDate = async () => {
    if (c.selectedIds.size === 0 || !batchCreatedTime.trim()) return;

    try {
      setSavingDate(true);
      const selectedImagesList = c.items.filter((img) => c.selectedIds.has(img.id));

      // Convert datetime-local to ISO string
      const createdTimeISO = new Date(batchCreatedTime).toISOString();

      // Prepare batch updates for createdTime only
      const updates = selectedImagesList.map((image) => ({
        id: image.id,
        updates: {
          createdTime: createdTimeISO,
        },
      }));

      // Use service layer for batch update
      await imageService.batchUpdateImages(updates);

      // Refresh images after batch update
      await c.reload();

      alert(t.alerts.dateUpdated(selectedImagesList.length));
      setBatchCreatedTime(''); // Clear date after successful update
    } catch (err: any) {
      console.error('Error batch updating date:', err);
      alert(t.alerts.dateUpdateFailed(err.message));
    } finally {
      setSavingDate(false);
    }
  };

  const syncWithStorage = async () => {
    if (!confirm(t.alerts.syncConfirm)) return;

    try {
      setBatchSaving(true);

      // Use service layer sync method
      const syncedImages = await imageService.syncWithStorage();

      // Convert to admin format
      const adminImages: AdminImage[] = syncedImages.map((img) => ({
        ...img,
        processingStatus: null,
      }));

      c.setItems(adminImages);
      alert(t.alerts.synced);
    } catch (err: any) {
      console.error('Error syncing:', err);
      alert(t.alerts.syncFailed(err.message));
    } finally {
      setBatchSaving(false);
    }
  };

  // Automatic date parsing: page-owned confirm/report copy around the shared loop
  const handleAutomaticDateParsing = async () => {
    if (autoParse.candidates.length === 0) {
      alert(t.alerts.noImagesNeedParsing);
      return;
    }

    if (!confirm(t.alerts.autoParseConfirm(autoParse.candidates.length))) return;

    try {
      c.setError(null);
      const report = await autoParse.run();

      let resultMessage = `${t.alerts.doneHeader}\n\n`;
      resultMessage += `${t.alerts.successLine(report.successCount)}\n`;
      if (report.failCount > 0) {
        resultMessage += `${t.alerts.failLine(report.failCount)}\n`;
      }
      resultMessage += t.alerts.detailsHeader;
      report.results.forEach((result) => {
        resultMessage += result.success
          ? `✅ ${result.label} → ${result.date}\n`
          : `❌ ${result.label} → ${result.error}\n`;
      });
      alert(resultMessage);
    } catch (error) {
      console.error('❌ Error during automatic date parsing:', error);
      c.setError(t.alerts.parseFailed(error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  };

  // Clearing the selection also resets the batch inputs
  const clearSelection = () => {
    c.clearSelection();
    setBatchTags('');
    setBatchCreatedTime('');
  };

  // Cat selector functions — CatSelectorModal pre-selects from the current tags
  // string and commits the new selection on 완료 (commit-on-done)
  const handleTagsInputClick = () => {
    setCatSelectorContext('individual');
    setShowCatSelector(true);
  };

  const handleBatchTagsInputClick = () => {
    setCatSelectorContext('batch');
    setShowCatSelector(true);
  };

  const catSelectorTags = (catSelectorContext === 'batch' ? batchTags : tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const handleCatSelectorTagsChange = (selectedCatNames: string[]) => {
    if (catSelectorContext === 'batch') {
      setBatchTags(selectedCatNames.join(', '));
    } else {
      setTags(selectedCatNames.join(', '));
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);
    setTags(updatedTags.join(', '));
  };

  if (c.loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <div className="mt-2 mb-4 h-1 w-12 rounded-full bg-brand" />
        <div className="flex items-center justify-center min-h-64">
          <div className="text-lg text-gray-600">{t.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <div className="mt-2 mb-4 h-1 w-12 rounded-full bg-brand" />
      {c.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {c.error}
          <button onClick={() => c.setError(null)} className="ml-2 text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}
      {/* Service Configuration Status */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-green-800 mb-2">{t.serviceBox.title}</h3>
        <div className="text-sm space-y-1">
          <div>
            <span className="text-green-700">{t.serviceBox.imagesLabel}</span>{' '}
            <span className="text-green-600">{t.serviceBox.imagesValue}</span>
          </div>
          <div>
            <span className="text-green-700">{t.serviceBox.operationsLabel}</span>{' '}
            <span className="text-green-600">{t.serviceBox.operationsValue}</span>
          </div>
          <div className="text-xs text-green-600 mt-2">{t.serviceBox.note}</div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="mb-6">
        <div className="mb-4 flex gap-3">
          <Button variant="secondary" size="sm" onClick={syncWithStorage} disabled={batchSaving}>
            🔄 {batchSaving ? t.actions.syncing : t.actions.sync}
          </Button>

          <Button size="sm" onClick={() => c.reload()} disabled={c.loading}>
            🔄 {c.loading ? t.actions.refreshing : t.actions.refresh}
          </Button>

          <Button
            size="sm"
            onClick={handleAutomaticDateParsing}
            disabled={autoParse.parsing || c.loading}
          >
            🤖 {autoParse.parsing ? t.actions.parsing : t.actions.autoDateParse}
          </Button>
        </div>
      </div>
      {/* Statistics */}
      <MediaStatsCards
        cards={[
          { label: t.stats.total, value: c.items.length },
          {
            label: t.stats.untagged,
            value: c.untaggedItems.length,
            valueClassName: 'text-orange-600',
          },
          { label: t.stats.tagged, value: c.taggedItems.length, valueClassName: 'text-green-600' },
          {
            label: t.stats.needDateParse,
            value: autoParse.candidates.length,
            valueClassName: 'text-brand-600',
            note:
              autoParse.processingIds.size > 0
                ? t.stats.processing(autoParse.processingIds.size)
                : undefined,
          },
        ]}
      />
      {/* Filter Controls */}
      <MediaFilterBar
        controller={c}
        labels={t.filters}
        sortOptions={[
          { value: 'created', label: t.filters.sortCreated },
          { value: 'uploaded', label: t.filters.sortUploaded },
        ]}
      />
      {/* Batch Actions */}
      {c.showBatchActions && (
        <BatchActionsPanel
          title={t.batch.title(c.selectedIds.size)}
          cancelLabel={t.batch.cancel}
          onCancel={clearSelection}
        >
          {/* Tags Section */}
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
              {t.batch.tags}
            </h4>
            <CatTagField
              value={batchTags}
              onChange={setBatchTags}
              onOpenSelector={handleBatchTagsInputClick}
              placeholder={t.batch.clickToSelect}
            />
            <Button
              size="sm"
              onClick={batchUpdateTags}
              disabled={savingTags || !batchTags.trim()}
              className="w-full"
            >
              {savingTags ? t.batch.saving : t.batch.saveTags}
            </Button>
            <p className="text-xs text-yellow-700 mt-1">{t.batch.addsToExisting}</p>
          </div>

          {/* Creation Date Section */}
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center">
              {t.batch.creationDate}
            </h4>
            <input
              type="datetime-local"
              value={batchCreatedTime}
              onChange={(e) => setBatchCreatedTime(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 w-full text-sm mb-2"
            />
            <Button
              size="sm"
              onClick={batchUpdateDate}
              disabled={savingDate || !batchCreatedTime.trim()}
              className="w-full"
            >
              {savingDate ? t.batch.saving : t.batch.saveDate}
            </Button>
            <p className="text-xs text-purple-700 mt-1">{t.batch.overwritesDate}</p>
          </div>
        </BatchActionsPanel>
      )}
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image List */}
        <div className="lg:col-span-2">
          <MediaGrid
            items={c.paginatedItems}
            emptyMessage={t.grid.noMatch}
            renderCard={(image) => (
              <div
                className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                  selectedImage?.id === image.id
                    ? 'border-brand-500 shadow-lg'
                    : autoParse.processingIds.has(image.id)
                      ? 'border-purple-500 shadow-md'
                      : 'border-gray-200'
                }`}
              >
                {/* Processing overlay */}
                {autoParse.processingIds.has(image.id) && (
                  <div className="absolute inset-0 bg-purple-500 bg-opacity-20 z-20 flex items-center justify-center">
                    <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {t.grid.parsingDate}
                    </div>
                  </div>
                )}

                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={c.selectedIds.has(image.id)}
                    onChange={() => c.toggleSelection(image.id)}
                    className="w-4 h-4 accent-brand-500 rounded"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Tag status indicator */}
                <div className="absolute top-2 right-2 z-10">
                  {image.tags && image.tags.length > 0 ? (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                      {t.grid.tagged}
                    </span>
                  ) : (
                    <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded">
                      {t.grid.untagged}
                    </span>
                  )}
                </div>

                {/* Image */}
                <div onClick={() => selectImage(image)}>
                  <img
                    src={image.imageUrl}
                    alt={image.fileName}
                    className="w-full h-40 object-cover"
                  />

                  <div className="p-3">
                    <p className="text-sm font-medium mb-1 break-words">{image.fileName}</p>
                    {image.uploadDate && (
                      <p className="text-xs text-gray-500 mb-1">
                        {t.grid.uploaded(
                          `${new Date(image.uploadDate).toLocaleDateString()} ${new Date(
                            image.uploadDate
                          ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        )}
                      </p>
                    )}
                    {image.createdTime && (
                      <p className="text-xs text-gray-500 mb-1">
                        {t.grid.created(
                          (() => {
                            const date = parseDate(image.createdTime);
                            return date ? date.toLocaleDateString() : t.grid.invalidDate;
                          })()
                        )}
                      </p>
                    )}
                    {image.tags && image.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {image.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="bg-brand-100 text-ink text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {image.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            {t.grid.moreCount(image.tags.length - 3)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          />

          {/* Pagination */}
          <PaginationBar
            currentPage={c.currentPage}
            totalPages={c.totalPages}
            onPageChange={c.setCurrentPage}
            previousLabel={t.grid.previous}
            nextLabel={t.grid.next}
          />
        </div>

        {/* Tagging Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm sticky top-6">
            {selectedImage ? (
              <>
                <div className="mb-4">
                  <div className="relative">
                    <img
                      src={selectedImage.imageUrl}
                      alt={selectedImage.fileName}
                      className="w-full h-32 object-cover rounded"
                    />

                    <button
                      onClick={() => setShowLightbox(true)}
                      className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs hover:bg-opacity-70 transition-all"
                      title={t.form.viewFullSize}
                    >
                      {t.form.fullSize}
                    </button>
                  </div>

                  {/* File Information Block */}
                  <h4 className="font-medium text-sm line-clamp-2 mt-2">
                    {selectedImage.fileName}
                  </h4>
                  <p className="text-xs text-gray-500 mb-1">
                    {t.form.uploaded}{' '}
                    {(() => {
                      try {
                        const date = new Date(selectedImage.uploadDate);
                        if (!isNaN(date.getTime())) {
                          return date.toLocaleDateString();
                        }
                        return t.form.unknown;
                      } catch (e) {
                        return t.form.unknown;
                      }
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mb-1">
                    {t.form.created}{' '}
                    {selectedImage.createdTime
                      ? (() => {
                          try {
                            const date = new Date(selectedImage.createdTime);
                            if (!isNaN(date.getTime())) {
                              return date.toLocaleDateString();
                            }
                            return t.form.invalidDate;
                          } catch (e) {
                            return t.form.invalidDate;
                          }
                        })()
                      : t.form.nullDate}
                  </p>
                  <div className="text-xs mb-2">
                    <span className="text-gray-500">{t.form.storage}</span>
                    <span className="text-gray-700 font-mono break-all text-xs">
                      {selectedImage.storagePath?.replace('cat_images/', '') ||
                        selectedImage.fileName}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.form.tags}
                    </label>

                    {/* Display existing tags as removable buttons */}
                    {tags && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {tags
                          .split(',')
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-100 text-ink"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-brand-200 text-ink/70 hover:text-ink"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                      </div>
                    )}

                    {/* Click area to open cat selector */}
                    <div
                      onClick={handleTagsInputClick}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus-within:ring-2 focus-within:ring-brand-300 cursor-pointer min-h-[40px] flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                    >
                      <span className="text-gray-600 text-sm">
                        {tags ? t.form.addMoreCats : t.form.selectCats}
                      </span>
                      <span className="text-brand-600 hover:text-brand-700 text-sm">
                        {t.form.selectCatsBtn}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.form.description}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t.form.descriptionPlaceholder}
                      className="border border-gray-300 rounded px-3 py-2 w-full h-20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.form.createdDate}
                    </label>
                    <input
                      type="date"
                      value={createdTime}
                      onChange={(e) => setCreatedTime(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                    />

                    <div className="text-xs text-gray-500 mt-1 mb-2">{t.form.createdDateHelp}</div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedImage) {
                          const parsedDate = parseCreatedDateFromFilename(selectedImage.fileName);
                          if (parsedDate) {
                            setCreatedTime(parsedDate.toISOString().split('T')[0]);
                            alert(
                              t.alerts.parsedFromFilename(parsedDate.toISOString().split('T')[0])
                            );
                          } else {
                            alert(t.alerts.parseFromFilenameFailed);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 text-brand-700 bg-brand-50 border border-brand-200 rounded hover:bg-brand-100 text-sm"
                    >
                      {t.form.parseFromFilename}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={saveImageMetadata} disabled={saving} className="flex-1">
                      {saving ? t.form.saving : t.form.saveChanges}
                    </Button>
                    <Button variant="danger" onClick={deleteImageAndMetadata} disabled={saving}>
                      {t.form.delete}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500">
                <div className="text-5xl mb-4">👆</div>
                <p>{t.form.emptyPrompt}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Date Parsing Configuration */}
      <div className="bg-brand-50 border border-brand-200 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-ink mb-3">{t.dateParsing.title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-ink/80 mb-2">
              <strong>{t.dateParsing.supportedFormats}</strong>
            </p>
            <ul className="text-ink/80 space-y-1 ml-4">
              <li>• YYYY-MM-DD HH.MM.SS (예: &quot;2024-03-15 14.30.45&quot;)</li>
              <li>• YYYYMMDD_HHMMSS (예: &quot;20240315_143045&quot;)</li>
              <li>• YYYY-MM-DD (날짜만, 예: &quot;2024-03-15&quot;)</li>
              <li>• YYYYMMDD (날짜만, 예: &quot;20240315&quot;)</li>
            </ul>
          </div>
          <div>
            <p className="text-ink/80 mb-2">
              <strong>{t.dateParsing.featureStatus}</strong>
            </p>
            <ul className="text-ink/80 space-y-1">
              <li>{t.dateParsing.statusIndividual}</li>
              <li>{t.dateParsing.statusBatch}</li>
              <li>{t.dateParsing.statusService}</li>
              <li>{t.dateParsing.readyCount(autoParse.candidates.length)}</li>
            </ul>
          </div>
        </div>
      </div>
      {/* Cat Selector Modal (shared; commits the selection on 완료) */}
      <CatSelectorModal
        isOpen={showCatSelector}
        onClose={() => setShowCatSelector(false)}
        selectedTags={catSelectorTags}
        onTagsChange={handleCatSelectorTagsChange}
        title={t.catSelector.title(catSelectorContext === 'batch')}
      />
      {/* Lightbox (shared viewer; single image, no prev/next) */}
      {showLightbox && selectedImage && (
        <Lightbox
          image={selectedImage}
          onClose={() => setShowLightbox(false)}
          onPrevious={() => {}}
          onNext={() => {}}
          hasPrevious={false}
          hasNext={false}
        />
      )}
    </div>
  );
}
