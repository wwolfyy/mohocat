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
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [showCleanupOption, setShowCleanupOption] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      console.log('Loading images from Firebase Storage...');

      // Get all images from Firebase Storage
      const storageRef = ref(storage, 'images/');
      const storageResult = await listAll(storageRef);

      console.log(`Found ${storageResult.items.length} images in storage`);

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

      const processedImages = (await Promise.all(imagePromises)).filter(Boolean) as StorageImage[];
      console.log(`Processed ${processedImages.length} images`);

      setImages(processedImages);
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

    try {
      setBatchSaving(true);
      const selectedImagesList = images.filter(img => selectedImages.has(img.name));
      let deletedCount = 0;

      console.log('Starting deletion process...');

      // Delete from Firebase Storage and Firestore
      for (const image of selectedImagesList) {
        try {
          console.log(`Deleting ${image.name}...`);

          // Delete from Firebase Storage
          const storageRef = ref(storage, image.fullPath);
          await deleteObject(storageRef);
          console.log(`✅ Deleted from Storage: ${image.name}`);

          // Delete from Firestore - try multiple approaches to ensure cleanup
          let firestoreDeleted = false;

          // Method 1: Delete using existing metadata ID if available
          if (image.hasMetadata && image.metadata?.id) {
            try {
              await deleteDoc(doc(db, 'images', image.metadata.id));
              console.log(`✅ Deleted from Firestore using ID: ${image.name}`);
              firestoreDeleted = true;
            } catch (error) {
              console.error(`Error deleting by ID for ${image.name}:`, error);
            }
          }

          // Method 2: Search for and delete any documents with matching filename
          if (!firestoreDeleted) {
            try {
              const firestoreQuery = query(collection(db, 'images'), where('filename', '==', image.name));
              const querySnapshot = await getDocs(firestoreQuery);

              for (const docSnapshot of querySnapshot.docs) {
                await deleteDoc(doc(db, 'images', docSnapshot.id));
                console.log(`✅ Deleted from Firestore by filename query: ${image.name}`);
                firestoreDeleted = true;
              }
            } catch (error) {
              console.error(`Error deleting by filename query for ${image.name}:`, error);
            }
          }

          if (!firestoreDeleted) {
            console.log(`⚠️  No Firestore metadata found for: ${image.name}`);
          }

          deletedCount++;
        } catch (error) {
          console.error(`Error deleting ${image.name}:`, error);
          // Continue with other images even if one fails
        }
      }

      console.log(`Deletion complete. Refreshing image list...`);
      await loadImages();
      clearSelection();      alert(`Successfully deleted ${deletedCount} images from storage and database!`);
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

    try {
      setBatchSaving(true);
      console.log('Starting orphaned metadata cleanup...');

      // Get all metadata from Firestore
      const firestoreImages = await getDocs(collection(db, 'images'));
      const storageImageNames = new Set(images.map(img => img.name));

      let cleanedCount = 0;
      for (const docSnapshot of firestoreImages.docs) {
        const data = docSnapshot.data();
        if (data.filename && !storageImageNames.has(data.filename)) {
          // This metadata has no corresponding storage file
          await deleteDoc(doc(db, 'images', docSnapshot.id));
          console.log(`🧹 Cleaned up orphaned metadata: ${data.filename}`);
          cleanedCount++;
        }
      }

      await loadImages();
      alert(`Cleanup complete! Removed ${cleanedCount} orphaned metadata entries.`);
    } catch (err: any) {
      console.error('Error cleaning up orphaned metadata:', err);
      alert('Failed to cleanup metadata: ' + err.message);
    } finally {
      setBatchSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🖼️</div>
        <p>Loading images from Firebase Storage...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
        <p style={{ color: '#dc2626' }}>{error}</p>
        <button
          onClick={loadImages}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          🖼️ Tag Images
        </h1>        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Found {images.length} images in storage.
          {images.filter(img => img.hasMetadata).length} have metadata,
          {images.filter(img => !img.hasMetadata).length} need tagging.
        </p>

        {/* Cleanup option */}
        <div style={{ marginBottom: '1rem' }}>
          <button
            onClick={cleanupOrphanedMetadata}
            disabled={batchSaving}
            style={{
              padding: '0.375rem 0.75rem',
              backgroundColor: batchSaving ? '#9ca3af' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: batchSaving ? 'not-allowed' : 'pointer',
              fontSize: '0.75rem'
            }}
          >
            🧹 {batchSaving ? 'Cleaning...' : 'Cleanup Orphaned Metadata'}
          </button>
        </div>

        {/* Multi-select controls */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={selectAllImages}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: selectedImages.size === images.length ? '#dc2626' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {selectedImages.size === images.length ? 'Deselect All' : 'Select All'}
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
