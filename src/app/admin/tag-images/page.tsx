'use client';

import { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { storage, db } from '@/services/firebase';
import { Cat } from '@/types';

interface StorageImage {
  name: string;
  url: string;
  fullPath: string;
  hasMetadata: boolean;
  metadata?: any;
}

export default function TagImagesPage() {
  const [images, setImages] = useState<StorageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<StorageImage | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());  const [tags, setTags] = useState<string>('');
  const [description, setDescription] = useState('');
  const [createdTime, setCreatedTime] = useState<string>(''); // New state for created date
  const [saving, setSaving] = useState(false);
  const [batchTags, setBatchTags] = useState<string>('');
  const [batchDescription, setBatchDescription] = useState('');
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);

  // Cat selector states
  const [cats, setCats] = useState<Cat[]>([]);
  const [showCatSelector, setShowCatSelector] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [catSelectorContext, setCatSelectorContext] = useState<'individual' | 'batch'>('individual');
  // Filter states
  const [showTaggedImages, setShowTaggedImages] = useState(true);
  const [showUntaggedImages, setShowUntaggedImages] = useState(true);
  const [showImagesWithoutTimestamp, setShowImagesWithoutTimestamp] = useState(true);
  const [enableDateFilter, setEnableDateFilter] = useState(false);  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [imagesPerPage, setImagesPerPage] = useState(25);

  // Sorting states
  const [sortBy, setSortBy] = useState<'created' | 'uploaded' | 'updated'>('uploaded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  useEffect(() => {
    loadImages(); // Use default (false) to allow bulk date parsing on initial load
    loadCats();
  }, []);

  // Helper function to parse creation date from filename
  const parseCreatedDateFromFilename = (filename: string): Date | null => {
    try {
      // Pattern 1: yyyy-mm-dd hh.MM.ss (with spaces or special chars around)
      const pattern1 = /(\d{4}-\d{2}-\d{2}\s+\d{2}\.\d{2}\.\d{2})/;
      const match1 = filename.match(pattern1);

      if (match1) {
        const dateTimeStr = match1[1];
        // Convert format: "2024-03-15 14.30.45" -> "2024-03-15T14:30:45"
        const isoFormat = dateTimeStr.replace(/\s+/, 'T').replace(/\./g, ':');
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
        const date = new Date(dateStr + 'T00:00:00');
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
  const loadImages = async (skipBulkDateParsing = false) => {
    try {
      setLoading(true);
      setError(null);// Get all images from both Firebase Storage folders
      const imagesRef = ref(storage, 'images/');
      const uploadsRef = ref(storage, 'uploads/');

      const [imagesResult, uploadsResult] = await Promise.all([
        listAll(imagesRef).catch(() => ({ items: [] })), // Handle case where folder doesn't exist
        listAll(uploadsRef).catch(() => ({ items: [] }))
      ]);

      // Combine all storage items from both folders
      const allStorageItems = [...imagesResult.items, ...uploadsResult.items];

      // Get existing metadata from Firestore
      const firestoreImages = await getDocs(collection(db, 'cat_images'));
      const metadataMap = new Map();
      firestoreImages.docs.forEach(doc => {
        const data = doc.data();
        if (data.fileName) {
          metadataMap.set(data.fileName, { id: doc.id, ...data });
        }
      });      // Process all storage items and create missing metadata
      const imageList: StorageImage[] = [];
      const missingMetadataItems = [];
      const missingCreatedTimeItems = [];

      for (const item of allStorageItems) {
        const url = await getDownloadURL(item);
        const metadata = metadataMap.get(item.name);

        const imageData: StorageImage = {
          name: item.name,
          url,
          fullPath: item.fullPath,
          hasMetadata: !!metadata,
          metadata
        };        imageList.push(imageData);

        // Only track items for bulk operations if not skipping bulk date parsing
        if (!skipBulkDateParsing) {
          // Track items that need metadata creation
          if (!metadata) {
            missingMetadataItems.push({
              fileName: item.name,
              imageUrl: url,
              storagePath: item.fullPath
            });
          }
          // Track items that have metadata but missing createdTime
          else if (!metadata.createdTime) {
            missingCreatedTimeItems.push({
              fileName: item.name,
              imageUrl: url,
              storagePath: item.fullPath,
              metadataId: metadata.id,
              existingMetadata: metadata
            });
          }
        }
      }

      // Only perform bulk operations if not skipping
      if (!skipBulkDateParsing) {
        // Create missing Firestore documents
        if (missingMetadataItems.length > 0) {
          console.log(`Creating metadata for ${missingMetadataItems.length} images...`);for (const item of missingMetadataItems) {
          try {
            // Parse creation date from filename
            const parsedCreatedTime = parseCreatedDateFromFilename(item.fileName);

            const newDoc = await addDoc(collection(db, 'cat_images'), {
              fileName: item.fileName,
              imageUrl: item.imageUrl,
              storagePath: item.storagePath,
              tags: [],
              description: '',
              uploadDate: new Date(),
              createdTime: parsedCreatedTime, // Use parsed date instead of null
              uploadedBy: 'auto-detected',
              needsTagging: true,
              autoTagged: false,
            });

            // Update the corresponding image in our list with the new metadata
            const imageIndex = imageList.findIndex(img => img.name === item.fileName);
            if (imageIndex !== -1) {
              imageList[imageIndex].hasMetadata = true;
              imageList[imageIndex].metadata = {
                id: newDoc.id,
                fileName: item.fileName,
                imageUrl: item.imageUrl,
                storagePath: item.storagePath,
                tags: [],
                description: '',
                uploadDate: new Date(),
                createdTime: parsedCreatedTime, // Use parsed date instead of null
                uploadedBy: 'auto-detected',
                needsTagging: true,
                autoTagged: false,
              };
            }

            // Log successful date parsing for debugging
            if (parsedCreatedTime) {
              console.log(`✅ Parsed date from "${item.fileName}": ${parsedCreatedTime.toISOString()}`);
            } else {
              console.log(`⚠️ Could not parse date from "${item.fileName}"`);
            }
          } catch (err) {
            console.error(`Failed to create metadata for ${item.fileName}:`, err);
          }
        }        console.log(`Successfully created metadata for ${missingMetadataItems.length} images.`);

        // Summary of date parsing results for new metadata
        const parsedDatesCount = missingMetadataItems.filter(item =>
          parseCreatedDateFromFilename(item.fileName) !== null
        ).length;

        if (parsedDatesCount > 0) {
          console.log(`📅 Successfully parsed creation dates from ${parsedDatesCount} out of ${missingMetadataItems.length} new images.`);
        }
      }

      // Update existing metadata documents that are missing createdTime
      if (missingCreatedTimeItems.length > 0) {
        console.log(`Updating createdTime for ${missingCreatedTimeItems.length} existing images...`);

        for (const item of missingCreatedTimeItems) {
          try {
            // Parse creation date from filename
            const parsedCreatedTime = parseCreatedDateFromFilename(item.fileName);

            if (parsedCreatedTime) {
              // Update the existing document with the parsed createdTime
              await updateDoc(doc(db, 'cat_images', item.metadataId), {
                createdTime: parsedCreatedTime
              });

              // Update the corresponding image in our list with the new createdTime
              const imageIndex = imageList.findIndex(img => img.name === item.fileName);
              if (imageIndex !== -1) {
                imageList[imageIndex].metadata = {
                  ...imageList[imageIndex].metadata,
                  createdTime: parsedCreatedTime
                };
              }

              console.log(`✅ Updated createdTime for "${item.fileName}": ${parsedCreatedTime.toISOString()}`);
            } else {
              console.log(`⚠️ Could not parse date from existing image "${item.fileName}"`);
            }
          } catch (err) {
            console.error(`Failed to update createdTime for ${item.fileName}:`, err);
          }
        }

        // Summary of date parsing results for existing metadata
        const updatedDatesCount = missingCreatedTimeItems.filter(item =>
          parseCreatedDateFromFilename(item.fileName) !== null
        ).length;        if (updatedDatesCount > 0) {
          console.log(`📅 Successfully updated creation dates for ${updatedDatesCount} out of ${missingCreatedTimeItems.length} existing images.`);
        }
      }
      } // End of if (!skipBulkDateParsing)

      setImages(imageList);
    } catch (err: any) {
      console.error('Error loading images:', err);
      setError('Failed to load images: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCats = async () => {
    try {
      const catsSnapshot = await getDocs(collection(db, 'cats'));
      const catsData = catsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cat[];
      setCats(catsData);
    } catch (error) {
      console.error('Error loading cats:', error);
    }
  };

  const selectImage = (image: StorageImage) => {
    setSelectedImage(image);
    if (image.metadata) {
      setTags(image.metadata.tags?.join(', ') || '');
      setDescription(image.metadata.description || '');

      // Format createdTime for date input (YYYY-MM-DD)
      let createdTimeStr = '';
      if (image.metadata.createdTime) {
        try {
          const date = new Date(image.metadata.createdTime.seconds ? image.metadata.createdTime.seconds * 1000 : image.metadata.createdTime);
          if (!isNaN(date.getTime())) {
            createdTimeStr = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Error parsing createdTime:', image.metadata.createdTime);
        }
      }
      setCreatedTime(createdTimeStr);
    } else {
      setTags('');
      setDescription('');
      setCreatedTime('');
    }
  };

  const saveImageMetadata = async () => {
    if (!selectedImage) return;

    try {
      setSaving(true);      const metadata = {
        fileName: selectedImage.name,
        imageUrl: selectedImage.url,
        storagePath: selectedImage.fullPath,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        uploadDate: selectedImage.metadata?.uploadDate || new Date(),
        createdTime: createdTime ? new Date(createdTime) : null,
        updated: new Date(), // Add timestamp for when metadata is updated
        uploadedBy: 'admin',
        description: description,
        needsTagging: false,
        autoTagged: false,
      };let updatedMetadata;
      if (selectedImage.hasMetadata && selectedImage.metadata?.id) {
        await updateDoc(doc(db, 'cat_images', selectedImage.metadata.id), metadata);
        updatedMetadata = { ...selectedImage.metadata, ...metadata };
      } else {
        const newDoc = await addDoc(collection(db, 'cat_images'), metadata);
        updatedMetadata = { id: newDoc.id, ...metadata };
      }

      // Update local state instead of reloading all images
      const updatedImage = {
        ...selectedImage,
        hasMetadata: true,
        metadata: updatedMetadata
      };

      setImages(images.map(img => img.name === selectedImage.name ? updatedImage : img));
      setSelectedImage(updatedImage);

      alert('Image metadata saved successfully!');
    } catch (err: any) {
      console.error('Error saving metadata:', err);
      alert('Failed to save metadata: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteImageAndMetadata = async () => {
    if (!selectedImage || !selectedImage.hasMetadata) return;

    if (!confirm('Are you sure you want to delete this image and its metadata?')) return;

    try {
      setSaving(true);

      // Delete from Storage
      const imageRef = ref(storage, selectedImage.fullPath);
      await deleteObject(imageRef);      // Delete metadata from Firestore
      if (selectedImage.metadata?.id) {
        await deleteDoc(doc(db, 'cat_images', selectedImage.metadata.id));
      }

      // Update local state instead of reloading all images
      setImages(images.filter(img => img.name !== selectedImage.name));
      setSelectedImage(null);

      alert('Image and metadata deleted successfully!');
    } catch (err: any) {
      console.error('Error deleting image:', err);
      alert('Failed to delete image: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCatToggle = (catId: string, catName: string) => {
    const newSelectedCats = new Set(selectedCats);
    if (newSelectedCats.has(catId)) {
      newSelectedCats.delete(catId);
    } else {
      newSelectedCats.add(catId);
    }
    setSelectedCats(newSelectedCats);

    // Update tags input with selected cat names
    const selectedCatNames = cats
      .filter(cat => newSelectedCats.has(cat.id))
      .map(cat => cat.name);
    setTags(selectedCatNames.join(', '));
  };

  const handleTagsInputClick = () => {
    setCatSelectorContext('individual');
    setShowCatSelector(true);
    // Parse existing tags to pre-select cats
    const existingTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const preSelectedCats = new Set<string>();
    cats.forEach(cat => {
      if (existingTags.includes(cat.name)) {
        preSelectedCats.add(cat.id);
      }
    });
    setSelectedCats(preSelectedCats);
  };

  const handleBatchTagsInputClick = () => {
    setCatSelectorContext('batch');
    setShowCatSelector(true);
    // Parse existing batch tags to pre-select cats
    const existingTags = batchTags.split(',').map(tag => tag.trim()).filter(Boolean);
    const preSelectedCats = new Set<string>();
    cats.forEach(cat => {
      if (existingTags.includes(cat.name)) {
        preSelectedCats.add(cat.id);
      }
    });
    setSelectedCats(preSelectedCats);
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
    const selectedCatNames = cats
      .filter(cat => newSelectedCats.has(cat.id))
      .map(cat => cat.name);
    setBatchTags(selectedCatNames.join(', '));  };

  const removeTag = async (tagToRemove: string) => {
    const currentTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
    const newTagsString = updatedTags.join(', ');
    setTags(newTagsString);

    // Auto-save the changes if we have a selected image
    if (selectedImage) {
      try {        const metadata = {
          fileName: selectedImage.name,
          imageUrl: selectedImage.url,
          storagePath: selectedImage.fullPath,
          tags: updatedTags,
          uploadDate: selectedImage.metadata?.uploadDate || new Date(),
          createdTime: selectedImage.metadata?.createdTime || null,
          updated: new Date(), // Add timestamp for when metadata is updated
          uploadedBy: 'admin',
          description: description,
          needsTagging: updatedTags.length === 0,
          autoTagged: false,
        };

        if (selectedImage.hasMetadata && selectedImage.metadata?.id) {
          await updateDoc(doc(db, 'cat_images', selectedImage.metadata.id), metadata);
        } else {
          await addDoc(collection(db, 'cat_images'), metadata);
        }

        // Update the local state to reflect the change immediately
        const updatedImageMetadata = { ...selectedImage.metadata, tags: updatedTags };
        const updatedImage = { ...selectedImage, metadata: updatedImageMetadata };
        setImages(images.map(img => img.name === selectedImage.name ? updatedImage : img));
        setSelectedImage(updatedImage);

      } catch (err: any) {
        console.error('Error saving after tag removal:', err);
        // Revert the local state if save failed
        setTags(tags);
      }
    }
  };

  const addTag = (newTag: string) => {
    if (!newTag.trim()) return;
    const currentTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    if (!currentTags.includes(newTag.trim())) {
      currentTags.push(newTag.trim());
      setTags(currentTags.join(', '));
    }
  };

  const filteredCats = cats.filter(cat =>
    cat.name.toLowerCase().includes(catSearchQuery.toLowerCase()) ||
    cat.alt_name?.toLowerCase().includes(catSearchQuery.toLowerCase())
  );

  const toggleImageSelection = (imageName: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageName)) {
      newSelection.delete(imageName);
    } else {
      newSelection.add(imageName);
    }
    setSelectedImages(newSelection);
    setShowBatchActions(newSelection.size > 0);
  };

  // Calculate statistics
  const untaggedImages = images.filter((img: StorageImage) => !img.hasMetadata || !img.metadata?.tags || img.metadata.tags.length === 0);
  const taggedImages = images.filter((img: StorageImage) => img.hasMetadata && img.metadata?.tags && img.metadata.tags.length > 0);
  // Apply filters to get displayed images
  const filteredImages = images.filter((image: StorageImage) => {
    // Tag filtering - check for actual tags, not just metadata existence
    const hasActualTags = image.hasMetadata && image.metadata?.tags && image.metadata.tags.length > 0;
    if (!hasActualTags && !showUntaggedImages) return false;
    if (hasActualTags && !showTaggedImages) return false;

    // Date filtering (only if enabled)
    if (enableDateFilter) {
      const createdDate = image.metadata?.createdDate;

      // Handle images without created date
      if (!createdDate) {
        if (!showImagesWithoutTimestamp) return false;
      } else {
        // Apply date range filters if they are set
        if (dateFilterFrom && createdDate < dateFilterFrom) return false;
        if (dateFilterTo && createdDate > dateFilterTo) return false;
      }
    } else {
      // When date filter is disabled, check if we should show images without timestamp
      const createdDate = image.metadata?.createdDate;
      if (!createdDate && !showImagesWithoutTimestamp) return false;
    }

    return true;
  }).sort((a, b) => {
    // Sorting logic
    let aValue: Date | null = null;
    let bValue: Date | null = null;

    if (sortBy === 'created') {
      aValue = a.metadata?.createdTime ? new Date(a.metadata.createdTime.seconds ? a.metadata.createdTime.seconds * 1000 : a.metadata.createdTime) : null;
      bValue = b.metadata?.createdTime ? new Date(b.metadata.createdTime.seconds ? b.metadata.createdTime.seconds * 1000 : b.metadata.createdTime) : null;
    } else if (sortBy === 'uploaded') {
      aValue = a.metadata?.uploadDate ? new Date(a.metadata.uploadDate.seconds ? a.metadata.uploadDate.seconds * 1000 : a.metadata.uploadDate) : null;
      bValue = b.metadata?.uploadDate ? new Date(b.metadata.uploadDate.seconds ? b.metadata.uploadDate.seconds * 1000 : b.metadata.uploadDate) : null;
    } else if (sortBy === 'updated') {
      aValue = a.metadata?.updated ? new Date(a.metadata.updated.seconds ? a.metadata.updated.seconds * 1000 : a.metadata.updated) : null;
      bValue = b.metadata?.updated ? new Date(b.metadata.updated.seconds ? b.metadata.updated.seconds * 1000 : b.metadata.updated) : null;
    }

    // Handle null values (images without the sort field)
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return sortOrder === 'asc' ? 1 : -1; // null values go to end for asc, beginning for desc
    if (bValue === null) return sortOrder === 'asc' ? -1 : 1;

    // Sort by date
    const comparison = aValue.getTime() - bValue.getTime();
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredImages.length / imagesPerPage);
  const startIndex = (currentPage - 1) * imagesPerPage;
  const endIndex = startIndex + imagesPerPage;
  const paginatedImages = filteredImages.slice(startIndex, endIndex);
  // Reset to page 1 when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [showTaggedImages, showUntaggedImages, showImagesWithoutTimestamp, enableDateFilter, dateFilterFrom, dateFilterTo, sortBy, sortOrder]);

  const selectAllImages = () => {
    const currentlyVisibleImages = new Set(filteredImages.map(img => img.name));
    const selectedFromVisible = new Set(Array.from(selectedImages).filter(name => currentlyVisibleImages.has(name)));

    if (selectedFromVisible.size === filteredImages.length) {
      // Deselect all visible images
      const newSelection = new Set(Array.from(selectedImages).filter(name => !currentlyVisibleImages.has(name)));
      setSelectedImages(newSelection);
      setShowBatchActions(newSelection.size > 0);
    } else {
      // Select all visible images
      const newSelection = new Set([...Array.from(selectedImages), ...filteredImages.map(img => img.name)]);
      setSelectedImages(newSelection);
      setShowBatchActions(true);
    }
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
    setShowBatchActions(false);
    setBatchTags('');
    setBatchDescription('');
  };

  const batchTagImages = async () => {
    if (selectedImages.size === 0) return;

    try {
      setBatchSaving(true);
      const selectedImagesList = images.filter(img => selectedImages.has(img.name));

      for (const image of selectedImagesList) {        const metadata = {
          fileName: image.name,
          imageUrl: image.url,
          storagePath: image.fullPath,
          tags: batchTags ?
            Array.from(new Set([...(image.metadata?.tags || []), ...batchTags.split(',').map(tag => tag.trim()).filter(Boolean)])) :
            image.metadata?.tags || [],
          uploadDate: image.metadata?.uploadDate || new Date(),
          createdTime: image.metadata?.createdTime || null,
          updated: new Date(), // Add timestamp for when metadata is updated
          uploadedBy: 'admin',
          description: batchDescription || image.metadata?.description || '',
          needsTagging: false,
          autoTagged: false,
        };

        if (image.hasMetadata && image.metadata?.id) {
          await updateDoc(doc(db, 'cat_images', image.metadata.id), metadata);
        } else {
          await addDoc(collection(db, 'cat_images'), metadata);
        }      }

      await loadImages(true); // Skip bulk date parsing when batch updating tags
      clearSelection();
      alert(`Successfully tagged ${selectedImagesList.length} images!`);
    } catch (err: any) {
      console.error('Error batch tagging:', err);
      alert('Failed to tag images: ' + err.message);
    } finally {
      setBatchSaving(false);
    }
  };

  const batchDeleteImages = async () => {
    if (selectedImages.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedImages.size} images and their metadata?`)) return;

    try {
      setBatchSaving(true);
      const selectedImagesList = images.filter(img => selectedImages.has(img.name));

      for (const image of selectedImagesList) {
        // Delete from Storage
        const imageRef = ref(storage, image.fullPath);
        await deleteObject(imageRef);

        // Delete metadata from Firestore if it exists
        if (image.hasMetadata && image.metadata?.id) {
          await deleteDoc(doc(db, 'images', image.metadata.id));
        }
      }      clearSelection();
      await loadImages(true); // Skip bulk date parsing when batch deleting images
      alert(`Successfully deleted ${selectedImagesList.length} images!`);
    } catch (err: any) {
      console.error('Error batch deleting:', err);
      alert('Failed to delete images: ' + err.message);
    } finally {
      setBatchSaving(false);
    }
  };
  const cleanupOrphanedMetadata = async () => {
    if (!confirm('This will remove metadata entries that no longer have corresponding images in storage. Continue?')) return;

    try {
      setBatchSaving(true);      // Get all metadata from Firestore
      const firestoreImages = await getDocs(collection(db, 'cat_images'));
      const storageFilenames = new Set(images.map(img => img.name));

      let deletedCount = 0;
      for (const doc of firestoreImages.docs) {
        const data = doc.data();
        if (data.fileName && !storageFilenames.has(data.fileName)) {
          await deleteDoc(doc.ref);
          deletedCount++;
        }      }

      await loadImages(true); // Skip bulk date parsing when cleaning up metadata
      alert(`Cleaned up ${deletedCount} orphaned metadata entries.`);
    } catch (err: any) {
      console.error('Error cleaning up metadata:', err);
      alert('Failed to cleanup metadata: ' + err.message);
    } finally {
      setBatchSaving(false);
    }
  };
  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Tag Images</h1>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-lg text-gray-600">Loading images from Firebase Storage...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tag Images</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}      {/* Storage Configuration Status */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Firebase Storage Configuration</h3>
        <div className="text-sm space-y-1">
          <div>
            <span className="text-blue-700">Storage:</span>{' '}
            <span className="text-green-600">✅ Connected to Firebase Storage</span>
          </div>          <div>
            <span className="text-blue-700">Date Parsing:</span>{' '}
            <span className="text-green-600">✅ Auto-extracts creation dates from filenames (new & existing images)</span>
          </div>
          <div className="text-xs text-blue-600 mt-2">
            Supported date formats: yyyy-mm-dd hh.MM.ss, yyyymmdd_hhMMss, yyyy-mm-dd, yyyymmdd
          </div>
        </div>
      </div>{/* Cleanup and Refresh Actions */}
      <div className="mb-6">
        <div className="mb-4 flex gap-3">
          <button
            onClick={cleanupOrphanedMetadata}
            disabled={batchSaving}
            className={`px-3 py-2 text-white text-sm rounded ${
              batchSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 cursor-pointer'
            }`}
          >
            🧹 {batchSaving ? 'Cleaning...' : 'Cleanup Orphaned Metadata'}
          </button>          <button
            onClick={() => loadImages(false)} // false = don't skip bulk date parsing for Refresh Images
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 text-sm"
          >
            {loading ? 'Loading...' : '🔄 Refresh Images'}
          </button></div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Images</h3>
          <p className="text-3xl font-bold text-blue-600">{images.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Untagged Images</h3>
          <p className="text-3xl font-bold text-orange-600">{untaggedImages.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Tagged Images</h3>
          <p className="text-3xl font-bold text-green-600">{taggedImages.length}</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter Images</h3>        {/* Tag Filters */}
        <div className="flex gap-6 mb-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showTaggedImages}
              onChange={(e) => setShowTaggedImages(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500 mr-2"
            />
            <span className="text-sm text-gray-700">
              Show Tagged Images ({taggedImages.length})
            </span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showUntaggedImages}
              onChange={(e) => setShowUntaggedImages(e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 mr-2"
            />
            <span className="text-sm text-gray-700">
              Show Untagged Images ({untaggedImages.length})
            </span>
          </label>
        </div>

        {/* Date Filters */}
        <div className="border-t border-gray-300 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Filter by Created Date</h4>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showImagesWithoutTimestamp}
                onChange={(e) => setShowImagesWithoutTimestamp(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
              />
              <span className="text-sm text-gray-700">
                Show images without timestamp ({images.filter(img => !img.metadata?.createdDate).length})
              </span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableDateFilter}
                onChange={(e) => {
                  setEnableDateFilter(e.target.checked);
                  if (!e.target.checked) {
                    setDateFilterFrom('');
                    setDateFilterTo('');
                  }
                }}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 mr-2"
              />
              <span className="text-sm text-gray-700">Apply date range filter</span>
            </label>
            <div className="flex items-center gap-2">
              <label className={`text-sm ${enableDateFilter ? 'text-gray-700' : 'text-gray-400'}`}>From:</label>
              <input
                type="date"
                value={dateFilterFrom}
                onChange={(e) => setDateFilterFrom(e.target.value)}
                disabled={!enableDateFilter}
                className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                  enableDateFilter ? 'bg-white' : 'bg-gray-100 text-gray-400'
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className={`text-sm ${enableDateFilter ? 'text-gray-700' : 'text-gray-400'}`}>To:</label>
              <input
                type="date"
                value={dateFilterTo}
                onChange={(e) => setDateFilterTo(e.target.value)}
                disabled={!enableDateFilter}
                className={`border border-gray-300 rounded px-2 py-1 text-sm ${
                  enableDateFilter ? 'bg-white' : 'bg-gray-100 text-gray-400'
                }`}
              />
            </div>            {enableDateFilter && (dateFilterFrom || dateFilterTo) && (
              <button
                onClick={() => {
                  setDateFilterFrom('');
                  setDateFilterTo('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear dates
              </button>            )}
          </div>
        </div>

        {/* Selection and Display Controls */}
        <div className="border-t border-gray-300 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Selection & Display</h4>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={selectAllImages}
              className={`px-4 py-2 text-white rounded text-sm ${
                selectedImages.size === filteredImages.length
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {selectedImages.size === filteredImages.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedImages.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              >
                Clear Selection ({selectedImages.size})
              </button>
            )}            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created' | 'uploaded' | 'updated')}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
              >
                <option value="created">Created</option>
                <option value="uploaded">Uploaded</option>
                <option value="updated">Updated</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Images per page:</label>
              <select
                value={imagesPerPage}
                onChange={(e) => {
                  setImagesPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing page size
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredImages.length)} of {filteredImages.length} images
            </div>
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      {showBatchActions && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-3">
            Batch Actions ({selectedImages.size} images selected)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Tags (comma-separated)
              </label>
              <input
                type="text"
                value={batchTags}
                onChange={(e) => setBatchTags(e.target.value)}
                onClick={handleBatchTagsInputClick}
                placeholder="Click to select cats or type manually"
                className="border border-gray-300 rounded px-3 py-2 w-full cursor-pointer"
              />
              <button
                type="button"
                onClick={handleBatchTagsInputClick}
                className="absolute right-2 top-8 text-blue-500 hover:text-blue-700 text-sm"
              >
                🐱 Select Cats
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Description (optional)
              </label>
              <input
                type="text"
                value={batchDescription}
                onChange={(e) => setBatchDescription(e.target.value)}
                placeholder="Common description..."
                className="border border-gray-300 rounded px-3 py-2 w-full"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={batchTagImages}
              disabled={batchSaving || !batchTags.trim()}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              {batchSaving ? 'Saving...' : 'Save Batch Tags'}
            </button>
            <button
              onClick={batchDeleteImages}
              disabled={batchSaving}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 font-semibold"
            >
              {batchSaving ? 'Deleting...' : 'Delete Images'}
            </button>
            <button
              onClick={() => {
                setSelectedImages(new Set());
                setShowBatchActions(false);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* No Images Message */}
      {images.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">
            No images found in storage.
          </p>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">
            No images match the current filter settings.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Try checking different filter options above.
          </p>
        </div>
      ) : (        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image List */}
          <div className="lg:col-span-2">
            {/* Image Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {paginatedImages.map((image) => (
                <div
                  key={image.name}
                  className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                    selectedImage?.name === image.name
                      ? 'border-blue-500 shadow-lg'
                      : 'border-gray-200'
                  }`}
                >                  {/* Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedImages.has(image.name)}
                      onChange={(e) => toggleImageSelection(image.name)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>                  {/* Tag status indicator */}
                  <div className="absolute top-2 right-2 z-10">
                    {(image.hasMetadata && image.metadata?.tags && image.metadata.tags.length > 0) ? (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                        Tagged
                      </span>
                    ) : (
                      <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded">
                        Untagged
                      </span>
                    )}
                  </div>

                  {/* Image */}
                  <div onClick={() => selectImage(image)}>
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-40 object-cover"
                    />                    <div className="p-3">
                      <p className="text-sm font-medium mb-1 break-words">
                        {image.name}
                      </p>                      {image.hasMetadata && image.metadata?.uploadDate && (
                        <p className="text-xs text-gray-500 mb-1">
                          Uploaded: {new Date(image.metadata.uploadDate.seconds ? image.metadata.uploadDate.seconds * 1000 : image.metadata.uploadDate).toLocaleDateString()}
                          {image.metadata?.updated && (
                            <span> ({new Date(image.metadata.updated.seconds ? image.metadata.updated.seconds * 1000 : image.metadata.updated).toLocaleDateString()})</span>
                          )}
                        </p>
                      )}
                      {image.hasMetadata && (
                        <p className="text-xs text-gray-500 mb-1">
                          Created: {image.metadata?.createdTime ?
                            new Date(image.metadata.createdTime.seconds ? image.metadata.createdTime.seconds * 1000 : image.metadata.createdTime).toLocaleDateString() :
                            'null'
                          }                        </p>
                      )}
                    </div>
                  </div>
                </div>              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-6 gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Tagging Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm sticky top-6">
              {selectedImage ? (
                <>
                  <h3 className="text-lg font-bold mb-4">
                    Tag Image: {selectedImage.name}
                  </h3>                  <div className="mb-4">
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.name}
                      className="w-full h-32 object-cover rounded"
                    />
                    {/* Date Information */}
                    <div className="mt-2 text-xs text-gray-600 space-y-1">                      {selectedImage.hasMetadata && selectedImage.metadata?.uploadDate && (
                        <p>
                          <strong>Uploaded:</strong> {new Date(selectedImage.metadata.uploadDate.seconds ? selectedImage.metadata.uploadDate.seconds * 1000 : selectedImage.metadata.uploadDate).toLocaleDateString()}
                          {selectedImage.metadata?.updated && (
                            <span> ({new Date(selectedImage.metadata.updated.seconds ? selectedImage.metadata.updated.seconds * 1000 : selectedImage.metadata.updated).toLocaleDateString()})</span>
                          )}
                        </p>
                      )}
                      {selectedImage.hasMetadata && (
                        <p>
                          <strong>Created:</strong> {selectedImage.metadata?.createdTime ?
                            new Date(selectedImage.metadata.createdTime.seconds ? selectedImage.metadata.createdTime.seconds * 1000 : selectedImage.metadata.createdTime).toLocaleDateString() :
                            'null'
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags
                      </label>

                      {/* Display existing tags as removable buttons */}
                      {tags && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {tags.split(',').map(tag => tag.trim()).filter(Boolean).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 text-blue-600 hover:text-blue-800"
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
                      />

                      {/* Click area to open cat selector */}
                      <div
                        onClick={handleTagsInputClick}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-pointer min-h-[40px] flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                      >
                        <span className="text-gray-600 text-sm">
                          {tags ? 'Click to add more cats' : 'Click to select cats'}
                        </span>
                        <span className="text-blue-500 hover:text-blue-700 text-sm">
                          🐱 Select Cats
                        </span>                      </div>
                    </div>                    {/* Created Date Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Created Date
                      </label>
                      <input
                        type="date"
                        value={createdTime}
                        onChange={(e) => setCreatedTime(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="text-xs text-gray-500 mt-1 mb-2">
                        When the image was originally taken/created
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedImage) {
                            const parsedDate = parseCreatedDateFromFilename(selectedImage.name);
                            if (parsedDate) {
                              setCreatedTime(parsedDate.toISOString().split('T')[0]);
                            } else {
                              alert('Could not parse date from filename. Please set the date manually.');
                            }
                          }
                        }}
                        className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 border border-purple-300"
                      >
                        📅 Parse Date from Filename
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the image..."
                        rows={3}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex gap-2">                      <button
                        onClick={saveImageMetadata}
                        disabled={saving}
                        className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      {selectedImage.hasMetadata && (
                        <button
                          onClick={deleteImageAndMetadata}
                          disabled={saving}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-300"
                        >
                          {saving ? 'Deleting...' : 'Delete'}
                        </button>
                      )}                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500">
                  <div className="text-5xl mb-4">👆</div>
                  <p>Select an image from the grid to start tagging</p>
                </div>
              )}
            </div>
          </div>        </div>
      )}

      {/* Cat Selector Modal */}
      {showCatSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Select Cats {catSelectorContext === 'batch' ? '(Batch Tagging)' : '(Individual Image)'}
              </h3>
              <button
                onClick={() => setShowCatSelector(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search cats..."
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>

            {/* Cat list */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded">
              {filteredCats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {cats.length === 0 ? 'No cats found in database' : 'No cats match your search'}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-4">
                  {filteredCats.map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedCats.has(cat.id) ? 'bg-blue-50 border border-blue-200' : 'border border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCats.has(cat.id)}
                        onChange={() => catSelectorContext === 'batch'
                          ? handleCatToggleBatch(cat.id, cat.name)
                          : handleCatToggle(cat.id, cat.name)
                        }
                        className="mr-2"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{cat.name}</div>
                        {cat.alt_name && (
                          <div className="text-xs text-gray-500">({cat.alt_name})</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4">
              <button                onClick={() => {
                  setSelectedCats(new Set());
                  if (catSelectorContext === 'batch') {
                    setBatchTags('');
                  } else {
                    setTags('');
                  }
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowCatSelector(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Done ({selectedCats.size} selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
