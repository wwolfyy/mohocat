import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface AboutContent {
  /** Owning mountain (multi-mountain plan §2.3). Optional until the M4 backfill
   *  stamps every existing doc; M5 tightens reads/rules around it. */
  mountainId?: string;
  title: string;
  subtitle: string;
  mainContent: string;
  /**
   * The 대표 사진, resolved live from `about-photos/{mountainId}/{filename}` in
   * Firebase Storage. ⚠️ No `localPath`: the photo used to be downloaded into
   * `public/` at build time and served from a path baked into `mountains.json`,
   * which made static config — not this record — the real source of the image.
   */
  mainPhoto: {
    filename: string;
    caption: string;
    altText: string;
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
  // Per-tenant doc id: each mountain owns `about_content/{mountainId}` (M5.2a).
  // Previously a single shared `about_content/about` doc both tenants collided
  // on; the migration copies the legacy doc to its per-mountain id.
  constructor(private readonly mountainId: string) {}

  async getAboutContent(): Promise<AboutContent | null> {
    try {
      const docRef = doc(db, this.collectionName, this.mountainId);
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
      const docRef = doc(db, this.collectionName, this.mountainId);
      const updateData = {
        ...content,
        mountainId: this.mountainId,
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: userEmail || 'unknown',
      };

      await setDoc(docRef, updateData, { merge: true });
    } catch (error) {
      console.error('Error updating about content:', error);
      throw error;
    }
  }

  async createAboutContent(content: AboutContent, userEmail?: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, this.mountainId);
      const createData = {
        ...content,
        mountainId: this.mountainId,
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: userEmail || 'unknown',
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
