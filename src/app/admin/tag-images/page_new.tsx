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
  const [selectedImage, setSelectedImage] = useState<StorageImage | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<string>('');
  const [description, setDescription] = useState('');
  const [catName, setCatName] = useState('');
  const [saving, setSaving] = useState(false);
  const [batchTags, setBatchTags] = useState<string>('');
  const [batchDescription, setBatchDescription] = useState('');
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);

  // Filter states
  const [showTaggedImages, setShowTaggedImages] = useState(true);
  const [showUntaggedImages, setShowUntaggedImages] = useState(true);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all images from Firebase Storage
      const storageRef = ref(storage, 'images/');
      const storageResult = await listAll(storageRef);

      // Get existing metadata from Firestore
      const firestoreImages = await getDocs(collection(db, 'images'));
      const metadataMap = new Map();
      firestoreImages.docs.forEach(doc => {
        const data = doc.data();
        if (data.filename) {
          metadataMap.set(data.filename, { id: doc.id, ...data });
        }
      });

      // Combine storage data with metadata
      const imageList: StorageImage[] = await Promise.all(
        storageResult.items.map(async (item) => {
          const url = await getDownloadURL(item);
          const metadata = metadataMap.get(item.name);
          return {
            name: item.name,
            url,
            fullPath: item.fullPath,
            hasMetadata: !!metadata,
            metadata
          };
        })
      );

      setImages(imageList);
    } catch (err: any) {
      console.error('Error loading images:', err);
      setError('Failed to load images: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectImage = (image: StorageImage) => {
    setSelectedImage(image);
    if (image.metadata) {
      setTags(image.metadata.tags?.join(', ') || '');
      setDescription(image.metadata.description || '');
      setCatName(image.metadata.catName || '');
    } else {
      setTags('');
      setDescription('');
      setCatName('');
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
        title: selectedImage.metadata?.title || selectedImage.name.replace(/\.[^/.]+$/, ''),
        description,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        catName,
        uploadedAt: selectedImage.metadata?.uploadedAt || new Date(),
        uploadedBy: 'admin',
        isPublic: true,
        lastModified: new Date()
      };

      if (selectedImage.hasMetadata && selectedImage.metadata?.id) {
        await updateDoc(doc(db, 'images', selectedImage.metadata.id), metadata);
      } else {
        await addDoc(collection(db, 'images'), metadata);
      }

      await loadImages();
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
      await deleteObject(imageRef);

      // Delete metadata from Firestore
      if (selectedImage.metadata?.id) {
        await deleteDoc(doc(db, 'images', selectedImage.metadata.id));
      }

      setSelectedImage(null);
      await loadImages();
      alert('Image and metadata deleted successfully!');
    } catch (err: any) {
      console.error('Error deleting image:', err);
      alert('Failed to delete image: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleImageSelection = (imageName: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageName)) {
      newSelection.delete(imageName);
    } else {
      newSelection.add(imageName);
    }
    setSelectedImages(newSelection);
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
          description: batchDescription || image.metadata?.description || '',
          tags: batchTags ?
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
      }

      clearSelection();
      await loadImages();
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
      setBatchSaving(true);

      // Get all metadata from Firestore
      const firestoreImages = await getDocs(collection(db, 'images'));
      const storageFilenames = new Set(images.map(img => img.name));

      let deletedCount = 0;
      for (const doc of firestoreImages.docs) {
        const data = doc.data();
        if (data.filename && !storageFilenames.has(data.filename)) {
          await deleteDoc(doc.ref);
          deletedCount++;
        }
      }

      await loadImages();
      alert(`Cleaned up ${deletedCount} orphaned metadata entries.`);
    } catch (err: any) {
      console.error('Error cleaning up metadata:', err);
      alert('Failed to cleanup metadata: ' + err.message);
    } finally {
      setBatchSaving(false);
    }
  };

  // Calculate statistics
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

      {/* Cleanup and Refresh Actions */}
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
          </label>
        </div>
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

            {/* Image Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredImages.map((image) => (
                <div
                  key={image.name}
                  className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                    selectedImage?.name === image.name
                      ? 'border-blue-500 shadow-lg'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className="absolute top-2 right-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleImageSelection(image.name);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedImages.has(image.name)}
                      onChange={() => {}} // Controlled by onClick above
                      className="w-5 h-5 text-blue-600 bg-white border-2 border-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  {/* Image */}
                  <div onClick={() => selectImage(image)}>
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-40 object-cover"
                    />
                    <div className="p-3">
                      <p className="text-sm font-medium mb-1 break-words">
                        {image.name}
                      </p>
                      <div className={`inline-block px-2 py-1 rounded-full text-xs ${
                        image.hasMetadata
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {image.hasMetadata ? '✅ Tagged' : '⚠️ Needs tags'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tagging Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm sticky top-6">
              {selectedImage ? (
                <>
                  <h3 className="text-lg font-bold mb-4">
                    Tag Image: {selectedImage.name}
                  </h3>

                  <div className="mb-4">
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.name}
                      className="w-full h-32 object-cover rounded"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="Enter tags..."
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cat Name
                      </label>
                      <input
                        type="text"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        placeholder="Name of the cat..."
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={saveImageMetadata}
                        disabled={saving}
                        className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
                      >
                        {saving ? 'Saving...' : 'Save Tags'}
                      </button>
                      {selectedImage.hasMetadata && (
                        <button
                          onClick={deleteImageAndMetadata}
                          disabled={saving}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-300"
                        >
                          {saving ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </div>

                    {selectedImage.hasMetadata && selectedImage.metadata && (
                      <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                        <h4 className="font-medium mb-2">Current Metadata:</h4>
                        <p><strong>Tags:</strong> {selectedImage.metadata.tags?.join(', ') || 'None'}</p>
                        <p><strong>Description:</strong> {selectedImage.metadata.description || 'None'}</p>
                        <p><strong>Cat Name:</strong> {selectedImage.metadata.catName || 'None'}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500">
                  <div className="text-5xl mb-4">👆</div>
                  <p>Select an image from the grid to start tagging</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
