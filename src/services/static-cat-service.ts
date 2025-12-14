import { ICatService } from './interfaces';
import { Cat } from '../types';
import { getAllCats, getCatsByPointId as getStaticCatsByPointId } from '@/lib/static-data';
import { FirebaseCatService } from './cat-service';

export class StaticCatService implements ICatService {
    private firebaseService: FirebaseCatService;

    constructor() {
        this.firebaseService = new FirebaseCatService();
    }

    // --- Read Methods (Use Static Data) ---

    async getAllCats(): Promise<Cat[]> {
        try {
            // Use static data for fast, public access with local image paths
            return await getAllCats();
        } catch (error) {
            console.warn('Failed to fetch from static data, falling back to Firebase', error);
            return this.firebaseService.getAllCats();
        }
    }

    async getCatById(id: string): Promise<Cat | null> {
        try {
            const allCats = await this.getAllCats();
            return allCats.find(cat => cat.id === id) || null;
        } catch (error) {
            return this.firebaseService.getCatById(id);
        }
    }

    async getCatByName(name: string): Promise<Cat | null> {
        try {
            const allCats = await this.getAllCats();
            return allCats.find(cat => cat.name === name) || null;
        } catch (error) {
            return this.firebaseService.getCatByName(name);
        }
    }

    async getCatsByPointId(pointId: string): Promise<{ current: Cat[]; former: Cat[] }> {
        try {
            // static-data exports getCatsByPointId, let's use it
            return await getStaticCatsByPointId(pointId);
        } catch (error) {
            console.warn('Failed to fetch from static data, falling back to Firebase', error);
            return this.firebaseService.getCatsByPointId(pointId);
        }
    }

    // --- Write Methods (Delegate to Firebase) ---

    async createCat(cat: Omit<Cat, 'id'>): Promise<Cat> {
        return this.firebaseService.createCat(cat);
    }

    async updateCat(id: string, updates: Partial<Cat>): Promise<Cat> {
        return this.firebaseService.updateCat(id, updates);
    }

    async deleteCat(id: string): Promise<void> {
        return this.firebaseService.deleteCat(id);
    }
}
