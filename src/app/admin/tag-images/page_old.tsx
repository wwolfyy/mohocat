'use client';

import { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { storage, db } from '@/services/firebase';

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
  const [selectedImage, setSelectedImage] = useState<StorageImage | null>(null);  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<string>('');
  const [description, setDescription] = useState('');
  const [catName, setCatName] = useState('');
  const [saving, setSaving] = useState(false);
  const [batchTags, setBatchTags] = useState<string>('');
  const [batchDescription, setBatchDescription] = useState('');
  const [showBatchActions, setShowBatchActions] = useState(false);  const [batchSaving, setBatchSaving] = useState(false);
  const [showCleanupOption, setShowCleanupOption] = useState(false);

  // Filter states
  const [showTaggedImages, setShowTaggedImages] = useState(true);
  const [showUntaggedImages, setShowUntaggedImages] = useState(true);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {    try {
      setLoading(true);

      // Get all images from Firebase Storage
      const storageRef = ref(storage, 'images/');      const storageResult = await listAll(storageRef);

      // Get existing metadata from Firestore
      const firestoreImages = await getDocs(collection(db, 'images'));
      const metadataMap = new Map();
      firestoreImages.docs.forEach(doc => {
        const data = doc.data();
        if (data.filename) {
          metadataMap.set(data.filename, { id: doc.id, ...data });
        }
      });

      // Process each image
      const imagePromises = storageResult.items.map(async (item) => {
        try {
          const url = await getDownloadURL(item);
          const filename = item.name;
          const hasMetadata = metadataMap.has(filename);

          return {
            name: filename,
            url,
            fullPath: item.fullPath,
            hasMetadata,
            metadata: hasMetadata ? metadataMap.get(filename) : null
          };
        } catch (error) {
          console.error(`Error processing ${item.name}:`, error);
          return null;
        }
      });

      const processedImages = (await Promise.all(imagePromises)).filter(Boolean) as StorageImage[];      setImages(processedImages);
    } catch (err: any) {
      console.error('Error loading images:', err);
      setError('Failed to load images from storage');
    } finally {
      setLoading(false);
    }
  };

  const saveImageMetadata = async () => {
    if (!selectedImage) return;

    try {
      setSaving(true);

      const metadata = {
        filename: selectedImage.name,
        url: selectedImage.url,
        fullPath: selectedImage.fullPath,
        title: catName || selectedImage.name.replace(/\.[^/.]+$/, ''),
        description,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        uploadedAt: new Date(),
        uploadedBy: 'admin',
        isPublic: true
      };

      if (selectedImage.hasMetadata && selectedImage.metadata?.id) {
        // Update existing document
        await updateDoc(doc(db, 'images', selectedImage.metadata.id), metadata);
      } else {
        // Create new document
        await addDoc(collection(db, 'images'), metadata);
      }

      // Refresh the image list
      await loadImages();

      // Clear the form
      setSelectedImage(null);
      setTags('');
      setDescription('');
      setCatName('');

      alert('Image metadata saved successfully!');
    } catch (err: any) {
      console.error('Error saving metadata:', err);
      alert('Failed to save metadata: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  const selectImage = (image: StorageImage) => {
    setSelectedImage(image);
    if (image.hasMetadata && image.metadata) {
      setTags(image.metadata.tags?.join(', ') || '');
      setDescription(image.metadata.description || '');
      setCatName(image.metadata.title || '');
    } else {
      setTags('');
      setDescription('');
      setCatName(image.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const toggleImageSelection = (imageName: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageName)) {
      newSelected.delete(imageName);
    } else {
      newSelected.add(imageName);
    }
    setSelectedImages(newSelected);
  };

  const selectAllImages = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(img => img.name)));
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

      for (const image of selectedImagesList) {
        const metadata = {
          filename: image.name,
          url: image.url,
          fullPath: image.fullPath,
          title: image.metadata?.title || image.name.replace(/\.[^/.]+$/, ''),
          description: batchDescription || image.metadata?.description || '',          tags: batchTags ?
            Array.from(new Set([...(image.metadata?.tags || []), ...batchTags.split(',').map(tag => tag.trim()).filter(Boolean)])) :
            image.metadata?.tags || [],
          uploadedAt: image.metadata?.uploadedAt || new Date(),
          uploadedBy: 'admin',
          isPublic: true,
          lastModified: new Date()
        };

        if (image.hasMetadata && image.metadata?.id) {
          await updateDoc(doc(db, 'images', image.metadata.id), metadata);
        } else {
          await addDoc(collection(db, 'images'), metadata);
        }
      }

      await loadImages();
      clearSelection();
      alert(`Successfully tagged ${selectedImagesList.length} images!`);
    } catch (err: any) {
      console.error('Error batch tagging:', err);
      alert('Failed to tag images: ' + err.message);
    } finally {
      setBatchSaving(false);
    }
  };  const batchDeleteImages = async () => {
    if (selectedImages.size === 0) return;

    const confirmed = confirm(`Are you sure you want to permanently delete ${selectedImages.size} images? This will remove them from both Firebase Storage and the database. This action cannot be undone.`);
    if (!confirmed) return;

    try {      setBatchSaving(true);
      const selectedImagesList = images.filter(img => selectedImages.has(img.name));
      let deletedCount = 0;      // Delete from Firebase Storage and Firestore
      for (const image of selectedImagesList) {
        try {
          // Delete from Firebase Storage
          const storageRef = ref(storage, image.fullPath);
          await deleteObject(storageRef);

          // Delete from Firestore - try multiple approaches to ensure cleanup
          let firestoreDeleted = false;

          // Method 1: Delete using existing metadata ID if available
          if (image.hasMetadata && image.metadata?.id) {            try {
              await deleteDoc(doc(db, 'images', image.metadata.id));
              firestoreDeleted = true;
            } catch (error) {
              console.error(`Error deleting by ID for ${image.name}:`, error);
            }
          }

          // Method 2: Search for and delete any documents with matching filename
          if (!firestoreDeleted) {
            try {
              const firestoreQuery = query(collection(db, 'images'), where('filename', '==', image.name));
              const querySnapshot = await getDocs(firestoreQuery);              for (const docSnapshot of querySnapshot.docs) {
                await deleteDoc(doc(db, 'images', docSnapshot.id));
                firestoreDeleted = true;
              }
            } catch (error) {
              console.error(`Error deleting by filename query for ${image.name}:`, error);
            }
          }          if (!firestoreDeleted) {
            // No Firestore metadata found for this image
          }

          deletedCount++;
        } catch (error) {
          console.error(`Error deleting ${image.name}:`, error);
          // Continue with other images even if one fails
        }
      }      await loadImages();
      clearSelection();
      alert(`Successfully deleted ${deletedCount} images from storage and database!`);
    } catch (err: any) {
      console.error('Error batch deleting:', err);
      alert('Failed to delete images: ' + err.message);
    } finally {
      setBatchSaving(false);
    }
  };

  const cleanupOrphanedMetadata = async () => {
    const confirmed = confirm('This will remove any database entries for images that no longer exist in storage. Continue?');
    if (!confirmed) return;

    try {      setBatchSaving(true);

      // Get all metadata from Firestore
      const firestoreImages = await getDocs(collection(db, 'images'));
      const storageImageNames = new Set(images.map(img => img.name));

      let cleanedCount = 0;
      for (const docSnapshot of firestoreImages.docs) {
        const data = docSnapshot.data();
        if (data.filename && !storageImageNames.has(data.filename)) {
          // This metadata has no corresponding storage file          await deleteDoc(doc(db, 'images', docSnapshot.id));
          cleanedCount++;
        }
      }

      await loadImages();
      alert(`Cleanup complete! Removed ${cleanedCount} orphaned metadata entries.`);
    } catch (err: any) {
      console.error('Error cleaning up orphaned metadata:', err);
      alert('Failed to cleanup metadata: ' + err.message);
    } finally {
      setBatchSaving(false);    }
  };

  const untaggedImages = images.filter(img => !img.hasMetadata);
  const taggedImages = images.filter(img => img.hasMetadata);

  // Apply filters to get displayed images
  const filteredImages = images.filter(image => {
    if (!image.hasMetadata && !showUntaggedImages) return false;
    if (image.hasMetadata && !showTaggedImages) return false;
    return true;
  });
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
      )}

      {/* Storage Configuration Status */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Firebase Storage Configuration</h3>
        <div className="text-sm">
          <span className="text-blue-700">Storage:</span>{' '}
          <span className="text-green-600">✅ Connected to Firebase Storage</span>
        </div>
      </div>

      {/* Video Statistics and Cleanup */}
      <div className="mb-6">
        {/* Cleanup option */}
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
          </button>
          
          <button
            onClick={loadImages}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 text-sm"
          >
            {loading ? 'Loading...' : '🔄 Refresh Images'}
          </button>
        </div>
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
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter Images</h3>
        
        {/* Tag Filters */}
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
          </label>        </div>
      </div>

      {/* Batch Actions */}
      {showBatchActions && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-3">
            Batch Actions ({selectedImages.size} images selected)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Tags (comma-separated)
              </label>
              <input
                type="text"
                value={batchTags}
                onChange={(e) => setBatchTags(e.target.value)}
                placeholder="Enter tags..."
                className="border border-gray-300 rounded px-3 py-2 w-full"
              />
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

          <div className="flex gap-2 flex-wrap items-center">            <button
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image List */}
          <div className="lg:col-span-2">
            {/* Multi-select controls */}
            <div className="flex gap-3 items-center flex-wrap mb-4">
              <button
                onClick={selectAllImages}
                className={`px-4 py-2 text-white rounded text-sm ${
                  selectedImages.size === images.length 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {selectedImages.size === images.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedImages.size > 0 && (
                <>
                  <button
                    onClick={clearSelection}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={() => setShowBatchActions(!showBatchActions)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Batch Actions
                  </button>
                  <span className="px-3 py-2 bg-gray-100 rounded text-sm font-medium">
                    {selectedImages.size} selected
                  </span>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredImages.map((image) => (
          </button>
            {selectedImages.size > 0 && (
            <>
              <button
                onClick={clearSelection}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Clear Selection
              </button>
              <button
                onClick={() => setShowBatchActions(!showBatchActions)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Batch Actions
              </button>
              <span style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                {selectedImages.size} selected
              </span>
            </>
          )}
        </div>

        {/* Batch Actions Panel */}
        {showBatchActions && selectedImages.size > 0 && (
          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem',
            marginTop: '1rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
              🔧 Batch Actions ({selectedImages.size} images selected)
            </h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              {/* Batch Tagging */}
              <div style={{ flex: '2' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>
                  🏷️ Add Tags & Description
                </h4>
                <input
                  type="text"
                  placeholder="Add tags (comma separated)"
                  value={batchTags}
                  onChange={(e) => setBatchTags(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                />
                <textarea
                  placeholder="Add description (optional)"
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
                <button
                  onClick={batchTagImages}
                  disabled={batchSaving}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    backgroundColor: batchSaving ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: batchSaving ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  {batchSaving ? 'Applying...' : 'Apply Tags'}
                </button>
              </div>

              {/* Delete Action */}
              <div style={{ flex: '1' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>
                  🗑️ Delete Images
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
                  This will permanently delete selected images from Firebase Storage and remove their metadata from the database.
                </p>
                <button
                  onClick={batchDeleteImages}
                  disabled={batchSaving}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: batchSaving ? '#9ca3af' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: batchSaving ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  {batchSaving ? 'Deleting...' : 'Delete Selected Images'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Image Grid */}
        <div style={{ flex: '2' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>            {images.map((image, index) => (
              <div
                key={index}
                style={{
                  border: selectedImage?.name === image.name ? '3px solid #3b82f6' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  if (selectedImage?.name !== image.name) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedImage?.name !== image.name) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Checkbox */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    zIndex: 10
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleImageSelection(image.name);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.name)}
                    onChange={() => {}} // Controlled by onClick above
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      border: '2px solid #3b82f6',
                      borderRadius: '3px'
                    }}
                  />
                </div>

                {/* Image */}
                <div
                  onClick={() => selectImage(image)}
                  style={{ cursor: 'pointer' }}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{ padding: '0.75rem' }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      margin: '0 0 0.25rem 0',
                      wordBreak: 'break-word'
                    }}>                    {image.name}
                  </p>
                  <div style={{
                    display: 'inline-block',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    backgroundColor: image.hasMetadata ? '#dcfce7' : '#fef3c7',
                    color: image.hasMetadata ? '#166534' : '#92400e'
                  }}>
                    {image.hasMetadata ? '✅ Tagged' : '⚠️ Needs tags'}
                  </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tagging Form */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            position: 'sticky',
            top: '2rem'
          }}>
            {selectedImage ? (
              <>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  Tag Image: {selectedImage.name}
                </h3>

                <div style={{ marginBottom: '1rem' }}>
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.name}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      marginBottom: '0.5rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                    Cat Name/Title
                  </label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g., 개똥이"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the cat or scene..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., brown, mountain, sleeping"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <button
                  onClick={saveImageMetadata}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: saving ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : selectedImage.hasMetadata ? 'Update Metadata' : 'Save Metadata'}
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#6b7280' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👆</div>
                <p>Select an image from the grid to start tagging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
