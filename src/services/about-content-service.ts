import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface AboutContent {
  title: string;
  subtitle: string;
  mainContent: string;
  mainPhoto: {
    filename: string;
    caption: string;
    altText: string;
    localPath?: string;
  };
  sections: Array<{
    title: string;
    content: string;
  }>;
  lastUpdated?: any;
  lastUpdatedBy?: string;
}

export class AboutContentService {
  private collectionName = 'about_content';
  private documentId = 'about';

  async getAboutContent(): Promise<AboutContent | null> {
    try {
      const docRef = doc(db, this.collectionName, this.documentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as AboutContent;
      }

      return null;
    } catch (error) {
      console.error('Error getting about content:', error);
      throw error;
    }
  }

  async updateAboutContent(content: AboutContent, userEmail?: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, this.documentId);
      const updateData = {
        ...content,
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: userEmail || 'unknown'
      };

      await setDoc(docRef, updateData, { merge: true });
    } catch (error) {
      console.error('Error updating about content:', error);
      throw error;
    }
  }

  async createAboutContent(content: AboutContent, userEmail?: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, this.documentId);
      const createData = {
        ...content,
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: userEmail || 'unknown'
      };

      await setDoc(docRef, createData);
    } catch (error) {
      console.error('Error creating about content:', error);
      throw error;
    }
  }

  async saveAboutContent(content: AboutContent, userEmail?: string): Promise<void> {
    try {
      const existing = await this.getAboutContent();
      if (existing) {
        await this.updateAboutContent(content, userEmail);
      } else {
        await this.createAboutContent(content, userEmail);
      }
    } catch (error) {
      console.error('Error saving about content:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const aboutContentService = new AboutContentService();
