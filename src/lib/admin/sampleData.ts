// Sample data for testing the admin interface
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';

const sampleImages = [
  {
    id: 'img_001',
    url: '/images/thumbnails/개똥이.jpg',
    filename: '개똥이.jpg',
    title: '개똥이',
    description: 'A brown cat near the mountain trail',
    tags: ['brown', 'mountain', 'trail'],
    catIds: ['cat_gaeddong'],
    location: {
      lat: 37.3032,
      lng: 126.8378,
      name: '계양산 등산로'
    },
    metadata: {
      size: 245760,
      width: 800,
      height: 600,
      format: 'jpg'
    },
    uploadedAt: serverTimestamp(),
    uploadedBy: 'admin',
    isPublic: true,
    featured: false
  },
  {
    id: 'img_002',
    url: '/images/thumbnails/꽃분이.jpg',
    filename: '꽃분이.jpg',
    title: '꽃분이',
    description: 'A colorful cat sitting in the flowers',
    tags: ['colorful', 'flowers', 'sitting'],
    catIds: ['cat_kkotbun'],
    location: {
      lat: 37.3045,
      lng: 126.8395,
      name: '계양산 정상 근처'
    },
    metadata: {
      size: 312450,
      width: 1024,
      height: 768,
      format: 'jpg'
    },
    uploadedAt: serverTimestamp(),
    uploadedBy: 'admin',
    isPublic: true,
    featured: true
  },
  {
    id: 'img_003',
    url: '/images/thumbnails/누렁이.jpg',
    filename: '누렁이.jpg',
    title: '누렁이',
    description: 'A yellow cat basking in the sunlight',
    tags: ['yellow', 'sunlight', 'basking'],
    catIds: ['cat_nureong'],
    location: {
      lat: 37.3028,
      lng: 126.8372,
      name: '계양산 중턱'
    },
    metadata: {
      size: 189340,
      width: 640,
      height: 480,
      format: 'jpg'
    },
    uploadedAt: serverTimestamp(),
    uploadedBy: 'admin',
    isPublic: true,
    featured: false
  }
];

const sampleVideos = [
  {
    id: 'vid_001',
    url: 'https://example.com/videos/cats_playing.mp4',
    thumbnailUrl: '/images/thumbnails/대장이.jpg',
    filename: 'cats_playing.mp4',
    title: 'Mountain Cats Playing',
    description: 'Several cats playing together near the summit',
    tags: ['playing', 'multiple', 'summit'],
    catIds: ['cat_gaeddong', 'cat_kkotbun'],
    location: {
      lat: 37.3051,
      lng: 126.8401,
      name: '계양산 정상'
    },
    metadata: {
      size: 15728640,
      duration: 45,
      width: 1920,
      height: 1080,
      format: 'mp4',
      fps: 30
    },
    uploadedAt: serverTimestamp(),
    uploadedBy: 'admin',
    isPublic: true,
    featured: true
  },
  {
    id: 'vid_002',
    url: 'https://example.com/videos/cat_climbing.mp4',
    thumbnailUrl: '/images/thumbnails/메리.jpg',
    filename: 'cat_climbing.mp4',
    title: 'Cat Climbing Rocks',
    description: 'A cat skillfully climbing rocky terrain',
    tags: ['climbing', 'rocks', 'agile'],
    catIds: ['cat_mary'],
    location: {
      lat: 37.3041,
      lng: 126.8388,
      name: '계양산 바위지대'
    },
    metadata: {
      size: 8945120,
      duration: 23,
      width: 1280,
      height: 720,
      format: 'mp4',
      fps: 24
    },
    uploadedAt: serverTimestamp(),
    uploadedBy: 'admin',
    isPublic: true,
    featured: false
  }
];

const sampleCats = [
  {
    id: 'cat_gaeddong',
    name: '개똥이',
    description: 'A friendly brown cat that loves to explore the mountain trails',
    breed: 'Korean Shorthair',
    color: 'Brown',
    age: 'Adult',
    gender: 'Male',
    personality: ['friendly', 'curious', 'active'],
    lastSeen: {
      date: serverTimestamp(),
      location: '계양산 등산로'
    },
    health: {
      status: 'healthy',
      vaccinated: true,
      neutered: true
    },
    images: ['img_001'],
    videos: ['vid_001'],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'cat_kkotbun',
    name: '꽃분이',
    description: 'A beautiful colorful cat with distinctive markings',
    breed: 'Mixed',
    color: 'Calico',
    age: 'Young Adult',
    gender: 'Female',
    personality: ['gentle', 'photogenic', 'calm'],
    lastSeen: {
      date: serverTimestamp(),
      location: '계양산 정상 근처'
    },
    health: {
      status: 'healthy',
      vaccinated: true,
      neutered: true
    },
    images: ['img_002'],
    videos: ['vid_001'],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    id: 'cat_nureong',
    name: '누렁이',
    description: 'A golden-colored cat that enjoys sunny spots',
    breed: 'Korean Shorthair',
    color: 'Orange',
    age: 'Senior',
    gender: 'Male',
    personality: ['lazy', 'sunny', 'wise'],
    lastSeen: {
      date: serverTimestamp(),
      location: '계양산 중턱'
    },
    health: {
      status: 'healthy',
      vaccinated: true,
      neutered: true
    },
    images: ['img_003'],
    videos: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

export async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Add sample images
    console.log('Adding sample images...');
    for (const image of sampleImages) {
      await addDoc(collection(db, 'images'), image);
    }

    // Add sample videos
    console.log('Adding sample videos...');
    for (const video of sampleVideos) {
      await addDoc(collection(db, 'videos'), video);
    }

    // Add sample cats
    console.log('Adding sample cats...');
    for (const cat of sampleCats) {
      await addDoc(collection(db, 'cats'), cat);
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Usage: Import and call seedDatabase() in development
export { sampleImages, sampleVideos, sampleCats };
