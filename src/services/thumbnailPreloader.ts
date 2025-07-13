import { getCatService } from "@/services";
import type { Cat } from "@/types";

class ThumbnailPreloader {
  private loadedThumbnails = new Set<string>();
  private loadingPromises = new Map<string, Promise<void>>();
  private preloadedPoints = new Set<string>();

  /**
   * Preload all thumbnails for current cats at all given points
   */
  async preloadThumbnailsForPoints(pointIds: string[]): Promise<void> {
    const catService = getCatService();

    // Get all current cats for all points
    const allCatsPromises = pointIds.map(async (pointId) => {
      try {
        const { current } = await catService.getCatsByPointId(pointId);
        return current.filter(cat => cat.thumbnailUrl && cat.thumbnailUrl.trim() !== '');
      } catch (error) {
        console.error(`Error loading cats for point ${pointId}:`, error);
        return [];
      }
    });

    const allCatsArrays = await Promise.all(allCatsPromises);
    const allCats = allCatsArrays.flat();

    // Get unique thumbnail URLs (filter out duplicates and empty URLs)
    const thumbnailUrls = allCats
      .map(cat => cat.thumbnailUrl)
      .filter(url => url && url.trim() !== '');
    const uniqueThumbnailUrls = Array.from(new Set(thumbnailUrls));

    // Preload all thumbnails
    await this.preloadThumbnails(uniqueThumbnailUrls);

    // Mark these points as preloaded
    pointIds.forEach(pointId => this.preloadedPoints.add(pointId));
  }

  /**
   * Preload individual thumbnails
   */
  private async preloadThumbnails(urls: string[]): Promise<void> {
    const loadPromises = urls.map(url => this.preloadSingleThumbnail(url));
    await Promise.all(loadPromises);
  }

  /**
   * Preload a single thumbnail
   */
  private async preloadSingleThumbnail(url: string): Promise<void> {
    if (this.loadedThumbnails.has(url)) {
      return;
    }

    // If already loading, return the existing promise
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const loadPromise = new Promise<void>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        this.loadedThumbnails.add(url);
        this.loadingPromises.delete(url);
        resolve();
      };
      img.onerror = () => {
        this.loadingPromises.delete(url);
        reject(new Error(`Failed to load thumbnail: ${url}`));
      };
      img.src = url;
    });

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Check if a thumbnail is already loaded
   */
  isThumbnailLoaded(url: string): boolean {
    return this.loadedThumbnails.has(url);
  }

  /**
   * Wait for a specific thumbnail to load
   */
  async waitForThumbnail(url: string): Promise<void> {
    if (this.loadedThumbnails.has(url)) {
      return;
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Start loading if not already loading
    return this.preloadSingleThumbnail(url);
  }

  /**
   * Check if thumbnails for a point have been preloaded
   */
  arePointThumbnailsPreloaded(pointId: string): boolean {
    return this.preloadedPoints.has(pointId);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.loadedThumbnails.clear();
    this.loadingPromises.clear();
    this.preloadedPoints.clear();
  }
}

// Global instance
export const thumbnailPreloader = new ThumbnailPreloader();
