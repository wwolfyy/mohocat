"use client";

import { useState, useEffect } from "react";
import { getImageService, getCatService } from "@/services";
import { Cat } from "@/types";
import { CatImage } from "@/types/media";

interface AdminImage extends CatImage {
  // Additional admin-specific properties can be added here
  processingStatus?: "parsing" | "updating" | "deleting" | null;
}

export default function TagImagesPage() {
  // Service references
  const imageService = getImageService();
  // Uncomment when cat service is available
  // const catService = getCatService();

  // State management
  const [images, setImages] = useState<AdminImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<AdminImage | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  // Form states
  const [tags, setTags] = useState<string>("");
  const [description, setDescription] = useState("");
  const [createdTime, setCreatedTime] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Batch operation states
  const [batchTags, setBatchTags] = useState<string>("");
  const [batchCreatedTime, setBatchCreatedTime] = useState<string>("");
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  // Cat selector states
  const [cats, setCats] = useState<Cat[]>([]);
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState("");
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [catSelectorContext, setCatSelectorContext] = useState<
    "individual" | "batch"
  >("individual");

  // Lightbox state
  const [showLightbox, setShowLightbox] = useState(false);

  // Filter states
  const [showTaggedImages, setShowTaggedImages] = useState(true);
  const [showUntaggedImages, setShowUntaggedImages] = useState(true);
  const [showImagesWithoutTimestamp, setShowImagesWithoutTimestamp] =
    useState(true);
  const [enableDateFilter, setEnableDateFilter] = useState(false);
  const [dateFilterFrom, setDateFilterFrom] = useState("");
  const [dateFilterTo, setDateFilterTo] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [imagesPerPage, setImagesPerPage] = useState(25);

  // Sorting states
  const [sortBy, setSortBy] = useState<"created" | "uploaded">("uploaded");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Date parsing states
  const [parsingDates, setParsingDates] = useState(false);
  const [processingImages, setProcessingImages] = useState<Set<string>>(
    new Set(),
  );

  // Load data
  useEffect(() => {
    loadImages();
    loadCats();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use service layer to get all images
      const allImages = await imageService.getAllImages();

      // Convert to admin format
      const adminImages: AdminImage[] = allImages.map((img) => ({
        ...img,
        processingStatus: null,
      }));

      setImages(adminImages);
    } catch (err: any) {
      console.error("Error loading images:", err);
      setError("Failed to load images: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCats = async () => {
    try {
      // Use service layer to get all cats
      const catService = getCatService();
      const catsData = await catService.getAllCats();
      setCats(catsData);
    } catch (error) {
      console.error("Error loading cats:", error);
    }
  };

  const selectImage = (image: AdminImage) => {
    setSelectedImage(image);
    setTags(image.tags?.join(", ") || "");
    setDescription(image.description || "");

    // Format createdTime for date input
    let createdTimeStr = "";
    if (image.createdTime) {
      try {
        const date = new Date(image.createdTime);
        if (!isNaN(date.getTime())) {
          // Convert to UTC+9 timezone (Korea Standard Time)
          const utcTime = date.getTime();
          const utcPlus9Time = new Date(utcTime + 9 * 60 * 60 * 1000);
          createdTimeStr = utcPlus9Time.toISOString().split("T")[0];
        }
      } catch (e) {
        console.warn("Error parsing createdTime:", image.createdTime);
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
          .split(",")
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

      setImages(
        images.map((img) => (img.id === selectedImage.id ? updatedImage : img)),
      );
      setSelectedImage(updatedImage);

      alert("Image metadata saved successfully!");
    } catch (err: any) {
      console.error("Error saving metadata:", err);
      alert("Failed to save metadata: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteImageAndMetadata = async () => {
    if (!selectedImage) return;

    if (
      !confirm(
        "Are you sure you want to delete this image metadata? (Storage file will remain)",
      )
    )
      return;

    try {
      setSaving(true);

      // Use service layer to delete
      await imageService.deleteImage(selectedImage.id);

      // Update local state
      setImages(images.filter((img) => img.id !== selectedImage.id));
      setSelectedImage(null);

      alert("Image metadata deleted successfully!");
    } catch (err: any) {
      console.error("Error deleting image:", err);
      alert("Failed to delete image: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const batchUpdateImages = async () => {
    if (selectedImages.size === 0) return;

    try {
      setBatchSaving(true);
      const selectedImagesList = images.filter((img) =>
        selectedImages.has(img.id),
      );

      // Prepare batch updates
      const updates = selectedImagesList.map((image) => ({
        id: image.id,
        updates: {
          tags: batchTags
            ? Array.from(
                new Set([
                  ...(image.tags || []),
                  ...batchTags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                ]),
              )
            : image.tags || [],
        },
      }));

      // Use service layer for batch update
      await imageService.batchUpdateImages(updates);

      // Refresh images after batch update
      await loadImages();
      clearSelection();
      alert(`Successfully updated ${selectedImagesList.length} images!`);
    } catch (err: any) {
      console.error("Error batch updating:", err);
      alert("Failed to update images: " + err.message);
    } finally {
      setBatchSaving(false);
    }
  };

  const batchUpdateTags = async () => {
    if (selectedImages.size === 0 || !batchTags.trim()) return;

    try {
      setSavingTags(true);
      const selectedImagesList = images.filter((img) =>
        selectedImages.has(img.id),
      );

      // Prepare batch updates for tags only
      const updates = selectedImagesList.map((image) => ({
        id: image.id,
        updates: {
          tags: Array.from(
            new Set([
              ...(image.tags || []),
              ...batchTags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            ]),
          ),
        },
      }));

      // Use service layer for batch update
      await imageService.batchUpdateImages(updates);

      // Refresh images after batch update
      await loadImages();

      alert(
        `Successfully updated tags for ${selectedImagesList.length} images!`,
      );
      setBatchTags(""); // Clear tags after successful update
    } catch (err: any) {
      console.error("Error batch updating tags:", err);
      alert("Failed to update tags: " + err.message);
    } finally {
      setSavingTags(false);
    }
  };

  const batchUpdateDate = async () => {
    if (selectedImages.size === 0 || !batchCreatedTime.trim()) return;

    try {
      setSavingDate(true);
      const selectedImagesList = images.filter((img) =>
        selectedImages.has(img.id),
      );

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
      await loadImages();

      alert(
        `Successfully updated creation date for ${selectedImagesList.length} images!`,
      );
      setBatchCreatedTime(""); // Clear date after successful update
    } catch (err: any) {
      console.error("Error batch updating date:", err);
      alert("Failed to update creation date: " + err.message);
    } finally {
      setSavingDate(false);
    }
  };

  // Removed batchDeleteImages functionality

  const syncWithStorage = async () => {
    if (!confirm("This will sync metadata with storage files. Continue?"))
      return;

    try {
      setBatchSaving(true);

      // Use service layer sync method
      const syncedImages = await imageService.syncWithStorage();

      // Convert to admin format
      const adminImages: AdminImage[] = syncedImages.map((img) => ({
        ...img,
        processingStatus: null,
      }));

      setImages(adminImages);
      alert("Sync completed successfully!");
    } catch (err: any) {
      console.error("Error syncing:", err);
      alert("Failed to sync: " + err.message);
    } finally {
      setBatchSaving(false);
    }
  };

  // Automatic date parsing function
  const handleAutomaticDateParsing = async () => {
    // Count images that could benefit from date parsing
    const imagesNeedingDates = images.filter((image) => {
      const hasNoCreatedTime = !image.createdTime;
      const couldParseDate =
        parseCreatedDateFromFilename(image.fileName) !== null;
      return hasNoCreatedTime && couldParseDate;
    });

    if (imagesNeedingDates.length === 0) {
      alert(
        "❌ No images found that need date parsing.\n\nEither all images already have creation dates, or no image filenames contain parseable date patterns.",
      );
      return;
    }

    const confirmed = confirm(
      `🤖 Automatic Date Parsing\n\n` +
        `This will parse creation dates from image filenames and update:\n` +
        `• Image createdTime field\n\n` +
        `Found ${imagesNeedingDates.length} image(s) that could benefit from date parsing.\n\n` +
        `⚠️ This will make changes to the database and may take time to process.\n\n` +
        `Continue?`,
    );

    if (!confirmed) return;

    try {
      setParsingDates(true);
      setError(null);
      setProcessingImages(new Set()); // Clear any previous processing state

      let successCount = 0;
      let failCount = 0;
      const results = [];
      const updatedImages = [...images]; // Create a copy to batch updates

      console.log(
        `Starting automatic date parsing for ${imagesNeedingDates.length} images...`,
      );

      for (const image of imagesNeedingDates) {
        try {
          // Add image to processing set to show visual feedback
          setProcessingImages((prev) => {
            const newSet = new Set(prev);
            newSet.add(image.id);
            return newSet;
          });

          const parsedDate = parseCreatedDateFromFilename(image.fileName);
          if (parsedDate) {
            console.log(
              `📅 Parsing date for "${image.fileName}": ${parsedDate.toISOString()}`,
            );

            // Use service layer to update the image
            await imageService.updateImage(image.id, {
              createdTime: parsedDate,
            });

            console.log(`✅ Database updated for ${image.fileName}`);

            // Update the local copy
            const imageIndex = updatedImages.findIndex(
              (img) => img.id === image.id,
            );
            if (imageIndex !== -1) {
              updatedImages[imageIndex] = {
                ...updatedImages[imageIndex],
                createdTime: parsedDate,
              };
            }

            successCount++;
            results.push({
              image: image.fileName,
              date: parsedDate.toISOString().split("T")[0],
              success: true,
            });
          }

          // Remove image from processing set after completion
          setProcessingImages((prev) => {
            const newSet = new Set(prev);
            newSet.delete(image.id);
            return newSet;
          });
        } catch (error) {
          console.error(`❌ Error processing ${image.fileName}:`, error);
          failCount++;
          results.push({
            image: image.fileName,
            success: false,
            error:
              error instanceof Error ? error.message : "Date parsing failed",
          });

          // Remove image from processing set even on error
          setProcessingImages((prev) => {
            const newSet = new Set(prev);
            newSet.delete(image.id);
            return newSet;
          });
        }
      }

      // Batch update the entire images state once at the end
      setImages(updatedImages);

      // Show results
      let resultMessage = `🎉 Automatic Date Parsing Complete!\n\n`;
      resultMessage += `✅ Successfully processed: ${successCount} images\n`;
      if (failCount > 0) {
        resultMessage += `❌ Failed: ${failCount} images\n`;
      }
      resultMessage += `\n📋 Detailed Results:\n`;

      results.forEach((result) => {
        if (result.success) {
          resultMessage += `✅ ${result.image} → ${result.date}\n`;
        } else {
          resultMessage += `❌ ${result.image} → ${result.error}\n`;
        }
      });

      alert(resultMessage);
      console.log("📊 Date parsing completed:", {
        successCount,
        failCount,
        results,
      });
    } catch (error) {
      console.error("❌ Error during automatic date parsing:", error);
      setError(
        "Failed to parse dates: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setParsingDates(false);
      setProcessingImages(new Set()); // Clear processing state
    }
  };

  // Helper functions
  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImages(newSelection);
    setShowBatchActions(newSelection.size > 0);
  };

  const selectAllImages = () => {
    // Only select all visible images (no deselect functionality)
    const newSelection = new Set([
      ...Array.from(selectedImages),
      ...filteredImages.map((img) => img.id),
    ]);
    setSelectedImages(newSelection);
    setShowBatchActions(true);
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
    setShowBatchActions(false);
    setBatchTags("");
    setBatchCreatedTime("");
  };

  // Cat selector functions
  const handleCatToggle = (catId: string, catName: string) => {
    const newSelectedCats = new Set(selectedCats);
    if (newSelectedCats.has(catId)) {
      newSelectedCats.delete(catId);
    } else {
      newSelectedCats.add(catId);
    }
    setSelectedCats(newSelectedCats);

    // Update tags input with selected cat names
    const selectedCatNames = Array.from(newSelectedCats)
      .map((id) => cats.find((cat) => cat.id === id))
      .filter((cat) => cat)
      .map((cat) => cat!.name);
    setTags(selectedCatNames.join(", "));
  };

  const handleCatToggleBatch = (catId: string, catName: string) => {
    const newSelectedCats = new Set(selectedCats);
    if (newSelectedCats.has(catId)) {
      newSelectedCats.delete(catId);
    } else {
      newSelectedCats.add(catId);
    }
    setSelectedCats(newSelectedCats);

    // Update batch tags input with selected cat names
    const selectedCatNames = Array.from(newSelectedCats)
      .map((id) => cats.find((cat) => cat.id === id))
      .filter((cat) => cat)
      .map((cat) => cat!.name);
    setBatchTags(selectedCatNames.join(", "));
  };

  const handleTagsInputClick = () => {
    setCatSelectorContext("individual");
    setShowCatSelector(true);
    // Parse existing tags to pre-select cats
    const existingTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const preSelectedCats = new Set<string>();
    cats.forEach((cat) => {
      if (existingTags.includes(cat.name)) {
        preSelectedCats.add(cat.id);
      }
    });
    setSelectedCats(preSelectedCats);
  };

  const handleBatchTagsInputClick = () => {
    setCatSelectorContext("batch");
    setShowCatSelector(true);
    // Parse existing batch tags to pre-select cats
    const existingTags = batchTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const preSelectedCats = new Set<string>();
    cats.forEach((cat) => {
      if (existingTags.includes(cat.name)) {
        preSelectedCats.add(cat.id);
      }
    });
    setSelectedCats(preSelectedCats);
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);
    const newTagsString = updatedTags.join(", ");
    setTags(newTagsString);
  };

  // Filter and sort images
  const filteredImages = images
    .filter((image: AdminImage) => {
      // Tag filtering
      const hasActualTags = image.tags && image.tags.length > 0;
      if (!hasActualTags && !showUntaggedImages) return false;
      if (hasActualTags && !showTaggedImages) return false;

      // Date filtering
      if (enableDateFilter) {
        const createdTime = image.createdTime;
        if (!createdTime) {
          if (!showImagesWithoutTimestamp) return false;
        } else {
          const createdDate = new Date(createdTime).toISOString().split("T")[0];
          if (dateFilterFrom && createdDate < dateFilterFrom) return false;
          if (dateFilterTo && createdDate > dateFilterTo) return false;
        }
      } else {
        if (!image.createdTime && !showImagesWithoutTimestamp) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let aValue: Date | null = null;
      let bValue: Date | null = null;

      if (sortBy === "created") {
        // Handle createdTime which could be Date, Firebase Timestamp, or string
        aValue = a.createdTime
          ? (() => {
              if (a.createdTime instanceof Date) {
                return a.createdTime;
              } else if (
                typeof a.createdTime === "object" &&
                a.createdTime !== null &&
                "seconds" in a.createdTime
              ) {
                return new Date((a.createdTime as any).seconds * 1000);
              } else {
                return new Date(a.createdTime as any);
              }
            })()
          : null;
        bValue = b.createdTime
          ? (() => {
              if (b.createdTime instanceof Date) {
                return b.createdTime;
              } else if (
                typeof b.createdTime === "object" &&
                b.createdTime !== null &&
                "seconds" in b.createdTime
              ) {
                return new Date((b.createdTime as any).seconds * 1000);
              } else {
                return new Date(b.createdTime as any);
              }
            })()
          : null;
      } else if (sortBy === "uploaded") {
        aValue = a.uploadDate ? new Date(a.uploadDate) : null;
        bValue = b.uploadDate ? new Date(b.uploadDate) : null;
      }

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortOrder === "asc" ? 1 : -1;
      if (bValue === null) return sortOrder === "asc" ? -1 : 1;

      // Check for invalid dates
      if (isNaN(aValue.getTime()) && isNaN(bValue.getTime())) return 0;
      if (isNaN(aValue.getTime())) return sortOrder === "asc" ? 1 : -1;
      if (isNaN(bValue.getTime())) return sortOrder === "asc" ? -1 : 1;

      const comparison = aValue.getTime() - bValue.getTime();
      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Filtered cats for search
  const filteredCats = cats.filter(
    (cat) =>
      cat.name.toLowerCase().includes(catSearchQuery.toLowerCase()) ||
      (cat.alt_name &&
        cat.alt_name.toLowerCase().includes(catSearchQuery.toLowerCase())),
  );

  // Pagination
  const totalPages = Math.ceil(filteredImages.length / imagesPerPage);
  const startIndex = (currentPage - 1) * imagesPerPage;
  const endIndex = startIndex + imagesPerPage;
  const paginatedImages = filteredImages.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    showTaggedImages,
    showUntaggedImages,
    showImagesWithoutTimestamp,
    enableDateFilter,
    dateFilterFrom,
    dateFilterTo,
    sortBy,
    sortOrder,
  ]);

  // Statistics
  const untaggedImages = images.filter(
    (img) => !img.tags || img.tags.length === 0,
  );
  const taggedImages = images.filter((img) => img.tags && img.tags.length > 0);

  // Helper function to parse creation date from filename
  const parseCreatedDateFromFilename = (filename: string): Date | null => {
    try {
      // Pattern 1: yyyy-mm-dd hh.MM.ss (with spaces or special chars around)
      const pattern1 = /(\d{4}-\d{2}-\d{2}\s+\d{2}\.\d{2}\.\d{2})/;
      const match1 = filename.match(pattern1);

      if (match1) {
        const dateTimeStr = match1[1];
        // Convert format: "2024-03-15 14.30.45" -> "2024-03-15T14:30:45"
        const isoFormat = dateTimeStr.replace(/\s+/, "T").replace(/\./g, ":");
        const date = new Date(isoFormat);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Pattern 2: yyyymmdd_hhMMss (with spaces or special chars around)
      const pattern2 = /(\d{8}_\d{6})/;
      const match2 = filename.match(pattern2);

      if (match2) {
        const dateTimeStr = match2[1];
        // Convert format: "20240315_143045" -> "2024-03-15T14:30:45"
        const year = dateTimeStr.substring(0, 4);
        const month = dateTimeStr.substring(4, 6);
        const day = dateTimeStr.substring(6, 8);
        const hour = dateTimeStr.substring(9, 11);
        const minute = dateTimeStr.substring(11, 13);
        const second = dateTimeStr.substring(13, 15);

        const isoFormat = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        const date = new Date(isoFormat);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Additional pattern: yyyy-mm-dd (date only, no time)
      const pattern3 = /(\d{4}-\d{2}-\d{2})/;
      const match3 = filename.match(pattern3);

      if (match3) {
        const dateStr = match3[1];
        const date = new Date(dateStr + "T00:00:00");
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Additional pattern: yyyymmdd (date only, no time)
      const pattern4 = /(\d{8})/;
      const match4 = filename.match(pattern4);

      if (match4) {
        const dateStr = match4[1];
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);

        const isoFormat = `${year}-${month}-${day}T00:00:00`;
        const date = new Date(isoFormat);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      return null;
    } catch (error) {
      console.warn(`Error parsing date from filename "${filename}":`, error);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-oid="1_6oxhi">
        <h1 className="text-2xl font-bold mb-4" data-oid="ymu63k_">
          Tag Images (Service Layer)
        </h1>
        <div
          className="flex items-center justify-center min-h-64"
          data-oid="rag90_w"
        >
          <div className="text-lg text-gray-600" data-oid="k1g-00q">
            Loading images...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-oid="u3rlnwp">
      <h1 className="text-2xl font-bold mb-4" data-oid="cls0yll">
        Tag Images (Service Layer)
      </h1>
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          data-oid="jo89xa8"
        >
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
            data-oid="b-3_4ae"
          >
            ×
          </button>
        </div>
      )}
      {/* Service Configuration Status */}
      <div
        className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6"
        data-oid="s.jdfwy"
      >
        <h3
          className="text-sm font-semibold text-green-800 mb-2"
          data-oid="6u8.lu."
        >
          Service Layer Configuration
        </h3>
        <div className="text-sm space-y-1" data-oid="q5fg353">
          <div data-oid="b3tkekd">
            <span className="text-green-700" data-oid="44b_qfm">
              Images:
            </span>{" "}
            <span className="text-green-600" data-oid="-t.ik8g">
              ✅ Using Image Service Abstraction
            </span>
          </div>
          <div data-oid="x.09el-">
            <span className="text-green-700" data-oid="dvr-ijt">
              Operations:
            </span>{" "}
            <span className="text-green-600" data-oid="x_6:7yh">
              ✅ CRUD operations via service layer
            </span>
          </div>
          <div className="text-xs text-green-600 mt-2" data-oid="xcqrmt8">
            All database operations go through the service layer for better
            maintainability and multi-tenant support.
          </div>
        </div>
      </div>{" "}
      {/* Action Buttons */}
      <div className="mb-6" data-oid="ajg-85v">
        <div className="mb-4 flex gap-3" data-oid="8pjpewl">
          <button
            onClick={syncWithStorage}
            disabled={batchSaving}
            className={`px-3 py-2 text-white text-sm rounded ${
              batchSaving
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 cursor-pointer"
            }`}
            data-oid="8:t-dmv"
          >
            🔄 {batchSaving ? "Syncing..." : "Sync with Storage"}
          </button>

          <button
            onClick={() => loadImages()}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-sm"
            data-oid="1xydmf7"
          >
            {loading ? "Loading..." : "🔄 Refresh Images"}
          </button>

          <button
            onClick={handleAutomaticDateParsing}
            disabled={parsingDates || loading}
            className={`px-4 py-2 text-white rounded text-sm ${
              parsingDates || loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-500 hover:bg-purple-600 cursor-pointer"
            }`}
            data-oid="oqdwg.x"
          >
            {parsingDates ? "📅 Parsing..." : "🤖 Automatic Date Parsing"}
          </button>
        </div>
      </div>
      {/* Statistics */}
      <div
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
        data-oid="8-jj_bq"
      >
        <div className="bg-white p-4 rounded-lg shadow" data-oid=":p_1kr3">
          <h3
            className="text-lg font-semibold text-gray-700"
            data-oid="v:w_540"
          >
            Total Images
          </h3>
          <p className="text-3xl font-bold text-blue-600" data-oid="mz9wf.7">
            {images.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow" data-oid="i:6omei">
          <h3
            className="text-lg font-semibold text-gray-700"
            data-oid="xkrqzld"
          >
            Untagged Images
          </h3>
          <p className="text-3xl font-bold text-orange-600" data-oid="jhxii-h">
            {untaggedImages.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow" data-oid="ve8jtya">
          <h3
            className="text-lg font-semibold text-gray-700"
            data-oid="-uxk8de"
          >
            Tagged Images
          </h3>
          <p className="text-3xl font-bold text-green-600" data-oid="s:475ar">
            {taggedImages.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow" data-oid="ir:hevy">
          <h3
            className="text-lg font-semibold text-gray-700"
            data-oid="jq_cnv8"
          >
            Need Date Parsing
          </h3>
          <p className="text-3xl font-bold text-purple-600" data-oid="s7bqu78">
            {
              images.filter((image) => {
                const hasNoCreatedTime = !image.createdTime;
                const couldParseDate =
                  parseCreatedDateFromFilename(image.fileName) !== null;
                return hasNoCreatedTime && couldParseDate;
              }).length
            }
          </p>
          {processingImages.size > 0 && (
            <p className="text-sm text-purple-500 mt-1" data-oid="wqy-.dq">
              📅 Processing: {processingImages.size}
            </p>
          )}
        </div>
      </div>
      {/* Filter Controls */}
      <div
        className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6"
        data-oid="0sa3yzy"
      >
        <h3
          className="text-sm font-semibold text-gray-700 mb-3"
          data-oid="g1q:5t."
        >
          Filter Images
        </h3>

        {/* Tag Filters */}
        <div className="flex gap-6 mb-4" data-oid="uqtwg-d">
          <label
            className="flex items-center cursor-pointer"
            data-oid="_cjd8:j"
          >
            <input
              type="checkbox"
              checked={showTaggedImages}
              onChange={(e) => setShowTaggedImages(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500 mr-2"
              data-oid="hccztv:"
            />

            <span className="text-sm text-gray-700" data-oid="efzns_2">
              Show Tagged Images ({taggedImages.length})
            </span>
          </label>
          <label
            className="flex items-center cursor-pointer"
            data-oid="zp05ga9"
          >
            <input
              type="checkbox"
              checked={showUntaggedImages}
              onChange={(e) => setShowUntaggedImages(e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 mr-2"
              data-oid="vq:9pn9"
            />

            <span className="text-sm text-gray-700" data-oid="buj5d5t">
              Show Untagged Images ({untaggedImages.length})
            </span>
          </label>
        </div>

        {/* Date Filters */}
        <div className="border-t border-gray-300 pt-4" data-oid="a85.3f6">
          <h4
            className="text-sm font-semibold text-gray-700 mb-3"
            data-oid=".pgiw1l"
          >
            Filter by Created Date
          </h4>
          <div className="flex flex-wrap items-center gap-4" data-oid="9pwftck">
            <label
              className="flex items-center cursor-pointer"
              data-oid="m4e7n0e"
            >
              <input
                type="checkbox"
                checked={showImagesWithoutTimestamp}
                onChange={(e) =>
                  setShowImagesWithoutTimestamp(e.target.checked)
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                data-oid="_lvs38s"
              />

              <span className="text-sm text-gray-700" data-oid="zdfp0f4">
                Show images without timestamp (
                {images.filter((img) => !img.createdTime).length})
              </span>
            </label>
            <label
              className="flex items-center cursor-pointer"
              data-oid="k3qx0lx"
            >
              <input
                type="checkbox"
                checked={enableDateFilter}
                onChange={(e) => {
                  setEnableDateFilter(e.target.checked);
                  if (!e.target.checked) {
                    setDateFilterFrom("");
                    setDateFilterTo("");
                  }
                }}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 mr-2"
                data-oid="iold6qx"
              />

              <span className="text-sm text-gray-700" data-oid="k5gmqww">
                Apply date range filter
              </span>
            </label>
            <div className="flex items-center gap-2" data-oid="8.7cwpi">
              <label
                className={`text-sm ${enableDateFilter ? "text-gray-700" : "text-gray-400"}`}
                data-oid="e82g8a8"
              >
                From:
              </label>
              <input
                type="date"
                value={dateFilterFrom}
                onChange={(e) => setDateFilterFrom(e.target.value)}
                disabled={!enableDateFilter}
                className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                  enableDateFilter ? "bg-white" : "bg-gray-100 text-gray-400"
                }`}
                data-oid="huk6w.p"
              />
            </div>
            <div className="flex items-center gap-2" data-oid="j48d16m">
              <label
                className={`text-sm ${enableDateFilter ? "text-gray-700" : "text-gray-400"}`}
                data-oid="hnodu-g"
              >
                To:
              </label>
              <input
                type="date"
                value={dateFilterTo}
                onChange={(e) => setDateFilterTo(e.target.value)}
                disabled={!enableDateFilter}
                className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                  enableDateFilter ? "bg-white" : "bg-gray-100 text-gray-400"
                }`}
                data-oid="tpypqot"
              />
            </div>
          </div>
        </div>

        {/* Selection and Display Controls */}
        <div className="border-t border-gray-300 pt-4" data-oid="_9nw0wu">
          <h4
            className="text-sm font-semibold text-gray-700 mb-3"
            data-oid="z4ft83-"
          >
            Selection & Display
          </h4>
          <div className="flex flex-wrap items-center gap-4" data-oid="em_6sks">
            <button
              onClick={selectAllImages}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
              data-oid="h7:6y73"
            >
              Select All
            </button>
            {selectedImages.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                data-oid="7e1uq.m"
              >
                Clear Selection ({selectedImages.size})
              </button>
            )}
            <div className="flex items-center gap-2" data-oid="buxz8js">
              <label className="text-sm text-gray-700" data-oid="03r-27z">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "created" | "uploaded")
                }
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                data-oid="-fuhl8o"
              >
                <option value="created" data-oid="a0s.ith">
                  Created
                </option>
                <option value="uploaded" data-oid="pk960fc">
                  Uploaded
                </option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                data-oid="3rwh8ot"
              >
                <option value="desc" data-oid="e0f8ga3">
                  Newest First
                </option>
                <option value="asc" data-oid="newp0:1">
                  Oldest First
                </option>
              </select>
            </div>
            <div className="flex items-center gap-2" data-oid="-x0qavn">
              <label className="text-sm text-gray-700" data-oid="f-t.a61">
                Images per page:
              </label>
              <select
                value={imagesPerPage}
                onChange={(e) => {
                  setImagesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                data-oid="_bwuo8s"
              >
                <option value={10} data-oid="wbjd9k2">
                  10
                </option>
                <option value={25} data-oid="tysvvod">
                  25
                </option>
                <option value={50} data-oid="gad8tx8">
                  50
                </option>
                <option value={100} data-oid="rjffdpd">
                  100
                </option>
              </select>
            </div>
            <div className="text-sm text-gray-600" data-oid="h7i63hw">
              Showing {startIndex + 1}-
              {Math.min(endIndex, filteredImages.length)} of{" "}
              {filteredImages.length} images
            </div>
          </div>
        </div>
      </div>
      {/* Batch Actions */}
      {showBatchActions && (
        <div
          className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4"
          data-oid="5096-fj"
        >
          <h3 className="text-lg font-semibold mb-2" data-oid="2j59n_u">
            Batch Actions ({selectedImages.size} images selected)
          </h3>

          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            data-oid="02pnyy5"
          >
            {/* Tags Section */}
            <div
              className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg"
              data-oid="m..jcbj"
            >
              <h4
                className="text-sm font-semibold text-yellow-800 mb-2 flex items-center"
                data-oid="7qoihvz"
              >
                🏷️ Tags
              </h4>
              <div className="relative mb-2" data-oid="o0q90i0">
                <input
                  type="text"
                  value={batchTags}
                  onChange={(e) => setBatchTags(e.target.value)}
                  onClick={handleBatchTagsInputClick}
                  placeholder="Click to select cats..."
                  className="border border-gray-300 rounded px-2 py-1 w-full cursor-pointer pr-12 text-sm"
                  data-oid="0i0o0hc"
                />

                <button
                  type="button"
                  onClick={handleBatchTagsInputClick}
                  className="absolute right-1 top-1 text-blue-500 hover:text-blue-700 text-xs"
                  data-oid="rfkorsw"
                >
                  🐱
                </button>
              </div>

              {/* Tag chips */}
              {batchTags && (
                <div className="flex flex-wrap gap-1 mb-2" data-oid="-gpzyih">
                  {batchTags.split(",").map((tag, index) => {
                    const trimmedTag = tag.trim();
                    if (!trimmedTag) return null;
                    return (
                      <span
                        key={index}
                        className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded"
                        data-oid="m8o2.cc"
                      >
                        {trimmedTag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = batchTags
                              .split(",")
                              .map((t) => t.trim())
                              .filter((t) => t !== trimmedTag)
                              .join(", ");
                            setBatchTags(newTags);
                          }}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          data-oid="20564_y"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <button
                onClick={batchUpdateTags}
                disabled={savingTags || !batchTags.trim()}
                className="w-full px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                data-oid="l.oc.rs"
              >
                {savingTags ? "Saving..." : "Save Tags"}
              </button>
              <p className="text-xs text-yellow-700 mt-1" data-oid="1o3w7ic">
                ⚠️ Adds to existing tags
              </p>
            </div>

            {/* Creation Date Section */}
            <div
              className="bg-purple-50 border border-purple-200 p-3 rounded-lg"
              data-oid="-ggx:j9"
            >
              <h4
                className="text-sm font-semibold text-purple-800 mb-2 flex items-center"
                data-oid="1wmqq-t"
              >
                📅 Creation Date
              </h4>
              <input
                type="datetime-local"
                value={batchCreatedTime}
                onChange={(e) => setBatchCreatedTime(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 w-full text-sm mb-2"
                data-oid="hfs1233"
              />

              <button
                onClick={batchUpdateDate}
                disabled={savingDate || !batchCreatedTime.trim()}
                className="w-full px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                data-oid="5v-kk_."
              >
                {savingDate ? "Saving..." : "Save Date"}
              </button>
              <p className="text-xs text-purple-700 mt-1" data-oid="a6cgrr7">
                ⚠️ Overwrites existing date
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3" data-oid="vvfobmn">
            {/* Delete Metadata button removed */}
            <button
              onClick={clearSelection}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              data-oid="ca-d9q4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-oid="-t16qg_">
        {/* Image List */}
        <div className="lg:col-span-2" data-oid="9_srjdg">
          {filteredImages.length === 0 ? (
            <div className="text-center py-12" data-oid="hljn4ce">
              <p className="text-gray-600 text-lg" data-oid="5yilazb">
                No images match the current filter settings.
              </p>
            </div>
          ) : (
            <>
              {/* Image Grid */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                data-oid="wvem_n6"
              >
                {paginatedImages.map((image) => (
                  <div
                    key={image.id}
                    className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                      selectedImage?.id === image.id
                        ? "border-blue-500 shadow-lg"
                        : processingImages.has(image.id)
                          ? "border-purple-500 shadow-md"
                          : "border-gray-200"
                    }`}
                    data-oid="5bnu7hv"
                  >
                    {/* Processing overlay */}
                    {processingImages.has(image.id) && (
                      <div
                        className="absolute inset-0 bg-purple-500 bg-opacity-20 z-20 flex items-center justify-center"
                        data-oid="jozk.3i"
                      >
                        <div
                          className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                          data-oid="sw0on_9"
                        >
                          📅 Parsing Date...
                        </div>
                      </div>
                    )}

                    {/* Checkbox */}
                    <div
                      className="absolute top-2 left-2 z-10"
                      data-oid="_.r6yb2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedImages.has(image.id)}
                        onChange={() => toggleImageSelection(image.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                        data-oid="y05e36c"
                      />
                    </div>

                    {/* Tag status indicator */}
                    <div
                      className="absolute top-2 right-2 z-10"
                      data-oid="c0ie2t:"
                    >
                      {image.tags && image.tags.length > 0 ? (
                        <span
                          className="bg-green-500 text-white text-xs px-2 py-1 rounded"
                          data-oid="x-ggn2k"
                        >
                          Tagged
                        </span>
                      ) : (
                        <span
                          className="bg-orange-500 text-white text-xs px-2 py-1 rounded"
                          data-oid="yg4.n1i"
                        >
                          Untagged
                        </span>
                      )}
                    </div>

                    {/* Image */}
                    <div onClick={() => selectImage(image)} data-oid="2v8fa54">
                      <img
                        src={image.imageUrl}
                        alt={image.fileName}
                        className="w-full h-40 object-cover"
                        data-oid="q:0ceoj"
                      />

                      <div className="p-3" data-oid="1a42131">
                        <p
                          className="text-sm font-medium mb-1 break-words"
                          data-oid="uiq14uz"
                        >
                          {image.fileName}
                        </p>
                        {image.uploadDate && (
                          <p
                            className="text-xs text-gray-500 mb-1"
                            data-oid="afz37rn"
                          >
                            Uploaded:{" "}
                            {new Date(image.uploadDate).toLocaleDateString()}{" "}
                            {new Date(image.uploadDate).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                        {image.createdTime && (
                          <p
                            className="text-xs text-gray-500 mb-1"
                            data-oid="us2sb9m"
                          >
                            Created:{" "}
                            {(() => {
                              try {
                                // Handle both Firebase Timestamp and regular Date objects
                                const createdTime = image.createdTime as any;
                                const date = createdTime.seconds
                                  ? new Date(createdTime.seconds * 1000)
                                  : new Date(createdTime);
                                return date.toLocaleDateString();
                              } catch (error) {
                                return "Invalid Date";
                              }
                            })()}
                          </p>
                        )}
                        {image.tags && image.tags.length > 0 && (
                          <div
                            className="flex flex-wrap gap-1"
                            data-oid="uw6r0nc"
                          >
                            {image.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                data-oid="z5f896k"
                              >
                                {tag}
                              </span>
                            ))}
                            {image.tags.length > 3 && (
                              <span
                                className="text-xs text-gray-500"
                                data-oid="ouz9bry"
                              >
                                +{image.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  className="flex justify-center items-center mt-6 gap-2"
                  data-oid="t-yf1ei"
                >
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-oid="99xcad1"
                  >
                    Previous
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm border rounded ${
                          currentPage === pageNum
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                        data-oid="c8-z7j3"
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-oid="m7idtk8"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tagging Form */}
        <div className="lg:col-span-1" data-oid="1s2_8dl">
          <div
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm sticky top-6"
            data-oid="id2iorl"
          >
            {selectedImage ? (
              <>
                <div className="mb-4" data-oid="2_6i7j:">
                  <div className="relative" data-oid="ygtu2a2">
                    <img
                      src={selectedImage.imageUrl}
                      alt={selectedImage.fileName}
                      className="w-full h-32 object-cover rounded"
                      data-oid="m9.2f3t"
                    />

                    <button
                      onClick={() => setShowLightbox(true)}
                      className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs hover:bg-opacity-70 transition-all"
                      title="View full size"
                      data-oid="k2lv7bi"
                    >
                      🔍 Full Size
                    </button>
                  </div>

                  {/* File Information Block */}
                  <h4
                    className="font-medium text-sm line-clamp-2 mt-2"
                    data-oid="1mggkt4"
                  >
                    {selectedImage.fileName}
                  </h4>
                  <p className="text-xs text-gray-500 mb-1" data-oid="z12pv_j">
                    Uploaded:{" "}
                    {(() => {
                      try {
                        const date = new Date(selectedImage.uploadDate);
                        if (!isNaN(date.getTime())) {
                          return date.toLocaleDateString();
                        }
                        return "Unknown";
                      } catch (e) {
                        return "Unknown";
                      }
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mb-1" data-oid="4rjifhh">
                    Created:{" "}
                    {selectedImage.createdTime
                      ? (() => {
                          try {
                            const date = new Date(selectedImage.createdTime);
                            if (!isNaN(date.getTime())) {
                              return date.toLocaleDateString();
                            }
                            return "Invalid date";
                          } catch (e) {
                            return "Invalid date";
                          }
                        })()
                      : "null"}
                  </p>
                  <div className="text-xs mb-2" data-oid="h2cpid2">
                    <span className="text-gray-500" data-oid="80xpgv0">
                      Storage:{" "}
                    </span>
                    <span
                      className="text-blue-600 font-mono break-all text-xs"
                      data-oid="1gnawen"
                    >
                      {selectedImage.storagePath?.replace("cat_images/", "") ||
                        selectedImage.fileName}
                    </span>
                  </div>
                </div>

                <div className="space-y-4" data-oid="ea7vcqq">
                  <div data-oid="bi-3z0l">
                    <label
                      className="block text-sm font-medium text-gray-700 mb-1"
                      data-oid="vbyowmu"
                    >
                      Tags
                    </label>

                    {/* Display existing tags as removable buttons */}
                    {tags && (
                      <div
                        className="flex flex-wrap gap-2 mb-2"
                        data-oid="w465aay"
                      >
                        {tags
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              data-oid="i.62gql"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 text-blue-600 hover:text-blue-800"
                                data-oid="sjtncbq"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                      </div>
                    )}

                    {/* Hidden input for maintaining the comma-separated value */}
                    <input
                      type="hidden"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      data-oid="_.742jb"
                    />

                    {/* Click area to open cat selector */}
                    <div
                      onClick={handleTagsInputClick}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-pointer min-h-[40px] flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                      data-oid="zad9wla"
                    >
                      <span
                        className="text-gray-600 text-sm"
                        data-oid="kypmjou"
                      >
                        {tags
                          ? "Click to add more cats"
                          : "Click to select cats"}
                      </span>
                      <span
                        className="text-blue-500 hover:text-blue-700 text-sm"
                        data-oid="fxo606b"
                      >
                        🐱 Select Cats
                      </span>
                    </div>
                  </div>

                  <div data-oid="hd.zoed">
                    <label
                      className="block text-sm font-medium text-gray-700 mb-1"
                      data-oid="3cnz2-f"
                    >
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter description..."
                      className="border border-gray-300 rounded px-3 py-2 w-full h-20"
                      data-oid="lq0pufx"
                    />
                  </div>

                  <div data-oid="yaj5h5t">
                    <label
                      className="block text-sm font-medium text-gray-700 mb-1"
                      data-oid="j15b2ik"
                    >
                      Created Date
                    </label>
                    <input
                      type="date"
                      value={createdTime}
                      onChange={(e) => setCreatedTime(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      data-oid="mux6zel"
                    />

                    <div
                      className="text-xs text-gray-500 mt-1 mb-2"
                      data-oid="m31qoft"
                    >
                      When the image was originally taken/created
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedImage) {
                          const parsedDate = parseCreatedDateFromFilename(
                            selectedImage.fileName,
                          );
                          if (parsedDate) {
                            setCreatedTime(
                              parsedDate.toISOString().split("T")[0],
                            );
                            alert(
                              `✅ Parsed date from filename: ${parsedDate.toISOString().split("T")[0]}`,
                            );
                          } else {
                            alert("❌ Could not parse date from filename");
                          }
                        }
                      }}
                      className="w-full px-3 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 text-sm"
                      data-oid="m9to11b"
                    >
                      📅 Parse Date from Filename
                    </button>
                  </div>

                  <div className="flex gap-2" data-oid="22m018p">
                    <button
                      onClick={saveImageMetadata}
                      disabled={saving}
                      className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
                      data-oid="p-tm877"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={deleteImageAndMetadata}
                      disabled={saving}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-300"
                      data-oid="267g_h5"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500" data-oid="f:gofov">
                <div className="text-5xl mb-4" data-oid="d0xp162">
                  👆
                </div>
                <p data-oid="ajpg6:n">
                  Select an image from the grid to start tagging
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Date Parsing Configuration */}
      <div
        className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6"
        data-oid="dmx1qou"
      >
        <h3
          className="text-sm font-semibold text-blue-700 mb-3"
          data-oid="wo.d925"
        >
          🤖 Automatic Date Parsing
        </h3>
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
          data-oid="sn_65vr"
        >
          <div data-oid="5u0sqha">
            <p className="text-blue-600 mb-2" data-oid="4yi:0l:">
              <strong data-oid="y-0hpo2">Supported Date Formats:</strong>
            </p>
            <ul className="text-blue-600 space-y-1 ml-4" data-oid="z3_878k">
              <li data-oid="3znbltb">
                • YYYY-MM-DD HH.MM.SS (e.g., "2024-03-15 14.30.45")
              </li>
              <li data-oid="b850jxb">
                • YYYYMMDD_HHMMSS (e.g., "20240315_143045")
              </li>
              <li data-oid="qp2vkmr">
                • YYYY-MM-DD (date only, e.g., "2024-03-15")
              </li>
              <li data-oid="2hpi7j:">
                • YYYYMMDD (date only, e.g., "20240315")
              </li>
            </ul>
          </div>
          <div data-oid="wv9fai8">
            <p className="text-blue-600 mb-2" data-oid="cd0:y5v">
              <strong data-oid="2txvn4s">Feature Status:</strong>
            </p>
            <ul className="text-blue-600 space-y-1" data-oid="alyqkpo">
              <li data-oid="v97jgwd">✅ Individual date parsing (edit form)</li>
              <li data-oid="nzmpwpb">
                ✅ Automatic batch date parsing (button)
              </li>
              <li data-oid="5db9jrr">✅ Service layer integration</li>
              <li data-oid="iafs.:_">
                📊{" "}
                {
                  images.filter((image) => {
                    const hasNoCreatedTime = !image.createdTime;
                    const couldParseDate =
                      parseCreatedDateFromFilename(image.fileName) !== null;
                    return hasNoCreatedTime && couldParseDate;
                  }).length
                }{" "}
                images ready for date parsing
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* Cat Selector Modal */}
      {showCatSelector && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-oid="-am-g._"
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col"
            data-oid="k6yxj4y"
          >
            <div
              className="flex justify-between items-center mb-4"
              data-oid="g83qdjf"
            >
              <h3 className="text-lg font-semibold" data-oid="7669hnk">
                Select Cats{" "}
                {catSelectorContext === "batch"
                  ? "(Batch Tagging)"
                  : "(Individual Image)"}
              </h3>
              <button
                onClick={() => setShowCatSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
                data-oid="ox3clul"
              >
                ×
              </button>
            </div>

            {/* Search input */}
            <div className="mb-4" data-oid="9accuaa">
              <input
                type="text"
                placeholder="Search cats..."
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                data-oid=":lrykme"
              />
            </div>

            {/* Cat list */}
            <div
              className="flex-1 overflow-y-auto border border-gray-200 rounded"
              data-oid="5l_dk8."
            >
              {filteredCats.length === 0 ? (
                <div
                  className="p-4 text-center text-gray-500"
                  data-oid="w99sk7p"
                >
                  {cats.length === 0
                    ? "No cats found in database"
                    : "No cats match your search"}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-4" data-oid="up_m:w7">
                  {filteredCats.map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedCats.has(cat.id)
                          ? "bg-blue-50 border border-blue-200"
                          : "border border-gray-200"
                      }`}
                      data-oid="oah0mjd"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCats.has(cat.id)}
                        onChange={() =>
                          catSelectorContext === "batch"
                            ? handleCatToggleBatch(cat.id, cat.name)
                            : handleCatToggle(cat.id, cat.name)
                        }
                        className="mr-2"
                        data-oid="miafy8o"
                      />

                      <div className="flex-1" data-oid="z4rk2b.">
                        <div className="font-medium text-sm" data-oid="rq4r98n">
                          {cat.name}
                        </div>
                        {cat.alt_name && (
                          <div
                            className="text-xs text-gray-500"
                            data-oid="vvl:sz1"
                          >
                            ({cat.alt_name})
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4" data-oid="tiqab_6">
              <button
                onClick={() => {
                  setSelectedCats(new Set());
                  if (catSelectorContext === "batch") {
                    setBatchTags("");
                  } else {
                    setTags("");
                  }
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                data-oid="cl4hmn3"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowCatSelector(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                data-oid="e7-z0qy"
              >
                Done ({selectedCats.size} selected)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox Modal */}
      {showLightbox && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          data-oid="8grlwiu"
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] flex flex-col"
            data-oid="rq95d67"
          >
            {/* Close button */}
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all text-xl"
              title="Close"
              data-oid="5s:z4d2"
            >
              ×
            </button>

            {/* Image */}
            <img
              src={selectedImage.imageUrl}
              alt={selectedImage.fileName}
              className="max-w-full max-h-full object-contain"
              data-oid="4x6.zd-"
            />

            {/* Image info */}
            <div
              className="bg-black bg-opacity-75 text-white p-4 mt-2 rounded"
              data-oid="2uycnj1"
            >
              <p className="text-sm font-medium mb-1" data-oid=":84sb9o">
                {selectedImage.fileName}
              </p>
              <div className="text-xs space-y-1" data-oid="48pen62">
                {selectedImage.uploadDate && (
                  <p data-oid="hz0oka_">
                    <strong data-oid="o6o_h0l">Uploaded:</strong>{" "}
                    {(() => {
                      try {
                        const date = new Date(selectedImage.uploadDate);
                        if (!isNaN(date.getTime())) {
                          return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                        }
                        return "Invalid date";
                      } catch (e) {
                        return "Invalid date";
                      }
                    })()}
                  </p>
                )}
                {selectedImage.createdTime && (
                  <p data-oid="jia7zpk">
                    <strong data-oid="81bblfv">Created:</strong>{" "}
                    {(() => {
                      try {
                        const date = new Date(selectedImage.createdTime);
                        if (!isNaN(date.getTime())) {
                          return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                        }
                        return "Invalid date";
                      } catch (e) {
                        return "Invalid date";
                      }
                    })()}
                  </p>
                )}
                {selectedImage.tags && selectedImage.tags.length > 0 && (
                  <p data-oid="is6pg__">
                    <strong data-oid="01s8dvs">Tags:</strong>{" "}
                    {selectedImage.tags.join(", ")}
                  </p>
                )}
                {selectedImage.description && (
                  <p data-oid="1131mfs">
                    <strong data-oid="w2i:3te">Description:</strong>{" "}
                    {selectedImage.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
