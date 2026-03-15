/**
 * Migration Helper for Cat CMS
 *
 * This utility helps migrate from Google Sheets-based cat management
 * to the new CMS system. It provides functions to:
 * 1. Validate existing cat data
 * 2. Import data from the current data_updater.js workflow
 * 3. Export data for backup purposes
 */

import { getCatService } from '@/services';
import { Cat } from '@/types';

interface MigrationResult {
  success: boolean;
  message: string;
  importedCount?: number;
  skippedCount?: number;
  errors?: string[];
}

export class CatMigrationHelper {
  private catService = getCatService();

  /**
   * Validate cat data structure
   */
  validateCatData(catData: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!catData.name || typeof catData.name !== 'string') {
      errors.push('Name is required and must be a string');
    }

    if (catData.thumbnailUrl && typeof catData.thumbnailUrl !== 'string') {
      errors.push('Thumbnail URL must be a string');
    }

    if (catData.sex && !['M', 'F', 'U'].includes(catData.sex)) {
      errors.push('Sex must be one of: M, F, U');
    }

    if (catData.dob_certainty && !['certain', 'uncertain'].includes(catData.dob_certainty)) {
      errors.push('Date of birth certainty must be one of: certain, uncertain');
    }

    if (catData.status && !['산냥이', '집냥이', '별냥이', '행방불명'].includes(catData.status)) {
      errors.push('Status must be one of: 산냥이, 집냥이, 별냥이, 행방불명');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Import cats from Google Sheets data format
   */
  async importFromSheetsData(sheetsData: any[]): Promise<MigrationResult> {
    try {
      let importedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (const row of sheetsData) {
        try {
          // Validate the data
          const validation = this.validateCatData(row);
          if (!validation.valid) {
            errors.push(`Skipped cat ${row.name || 'unknown'}: ${validation.errors.join(', ')}`);
            skippedCount++;
            continue;
          }

          // Check if cat already exists
          const existingCats = await this.catService.getAllCats();
          const existingCat = existingCats.find(
            (cat) => cat.name.toLowerCase() === row.name.toLowerCase()
          );

          if (existingCat) {
            // Update existing cat
            await this.catService.updateCat(existingCat.id, row);
            importedCount++;
          } else {
            // Create new cat
            await this.catService.createCat(row);
            importedCount++;
          }
        } catch (error) {
          errors.push(`Failed to import cat ${row.name || 'unknown'}: ${error}`);
          skippedCount++;
        }
      }

      return {
        success: true,
        message: `Migration completed: ${importedCount} cats imported, ${skippedCount} skipped`,
        importedCount,
        skippedCount,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        message: `Migration failed: ${error}`,
        errors: [String(error)],
      };
    }
  }

  /**
   * Export all cats for backup
   */
  async exportAllCats(): Promise<{ success: boolean; data?: Cat[]; error?: string }> {
    try {
      const cats = await this.catService.getAllCats();
      return {
        success: true,
        data: cats,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Convert Google Sheets row to Cat object
   */
  convertSheetsRowToCat(row: any): Partial<Cat> {
    return {
      name: row.name || row.Name || '',
      alt_name: row.alt_name || row['Alt Name'] || row.alternative_name || '',
      description: row.description || row.Description || '',
      thumbnailUrl: row.thumbnailUrl || row['Thumbnail URL'] || row.thumbnail_url || '',
      dwelling: row.dwelling || row.Dwelling || row.current_dwelling || '',
      prev_dwelling: row.prev_dwelling || row['Previous Dwelling'] || row.previous_dwelling || '',
      date_of_birth: (() => {
        const dateValue = row.date_of_birth || row['Date of Birth'] || row.birthday || '';
        if (typeof dateValue === 'number') return dateValue;
        if (typeof dateValue === 'string' && dateValue.trim() !== '') {
          const numericValue = parseInt(dateValue.trim(), 10);
          if (!isNaN(numericValue) && numericValue > 1990 && numericValue < 2030) {
            return numericValue;
          }
        }
        return undefined;
      })(),
      sex: row.sex || row.Sex || row.gender || '',
      status: row.status || row.Status || 'active',
      character: row.character || row.Character || row.personality || '',
      sickness: row.sickness || row.Sickness || row.health || '',
    };
  }

  /**
   * Generate migration report
   */
  async generateMigrationReport(): Promise<{
    totalCats: number;
    activeCats: number;
    inactiveCats: number;
    missingThumbnails: number;
    missingLocations: number;
    recentlyUpdated: number;
  }> {
    try {
      const cats = await this.catService.getAllCats();

      return {
        totalCats: cats.length,
        activeCats: cats.filter((cat) => cat.status === '산냥이').length,
        inactiveCats: cats.filter((cat) => cat.status !== '산냥이').length,
        missingThumbnails: cats.filter((cat) => !cat.thumbnailUrl).length,
        missingLocations: cats.filter((cat) => !cat.dwelling).length,
        recentlyUpdated: cats.filter((cat) => {
          // This would require a timestamp field in the future
          return false;
        }).length,
      };
    } catch (error) {
      throw new Error(`Failed to generate migration report: ${error}`);
    }
  }
}

// Export singleton instance
export const catMigrationHelper = new CatMigrationHelper();
