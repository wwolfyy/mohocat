/**
 * Shared, pure filter / sort / unique-value helpers for cat lists.
 *
 * Extracted from the admin Cat Management card view so the card editor and the
 * spreadsheet grid apply identical filtering and sorting (single source of
 * truth). Pure functions — no React, no Firestore.
 */

import type { Cat } from '@/types';

export interface CatFilterState {
  searchTerm: string;
  statusFilter: string;
  locationFilter: string;
  genderFilter: string;
  /** Compared against `date_of_birth.toString()`. */
  birthYearFilter: string;
  /** 'true' | 'false' | 'unknown' | '' */
  neuteredFilter: string;
  /** 'true' | 'false' | '' */
  adoptableFilter: string;
}

export const EMPTY_CAT_FILTERS: CatFilterState = {
  searchTerm: '',
  statusFilter: '',
  locationFilter: '',
  genderFilter: '',
  birthYearFilter: '',
  neuteredFilter: '',
  adoptableFilter: '',
};

/** Filter a cat list. Verbatim port of the card view's predicate. */
export function filterCats(cats: Cat[], f: CatFilterState): Cat[] {
  const term = f.searchTerm.toLowerCase();

  return cats.filter((cat) => {
    const matchesSearch =
      cat.name.toLowerCase().includes(term) ||
      cat.alt_name?.toLowerCase().includes(term) ||
      cat.description?.toLowerCase().includes(term) ||
      cat.character?.toLowerCase().includes(term) ||
      cat.parents?.toLowerCase().includes(term) ||
      cat.offspring?.toLowerCase().includes(term) ||
      cat.note?.toLowerCase().includes(term) ||
      cat.dob_certainty?.toLowerCase().includes(term);

    const matchesStatus = !f.statusFilter || cat.status === f.statusFilter;

    const matchesLocation =
      !f.locationFilter ||
      cat.dwelling === f.locationFilter ||
      cat.prev_dwelling === f.locationFilter;

    const matchesGender = !f.genderFilter || cat.sex === f.genderFilter;

    const matchesBirthYear =
      !f.birthYearFilter || cat.date_of_birth?.toString() === f.birthYearFilter;

    const matchesNeutered =
      !f.neuteredFilter ||
      (f.neuteredFilter === 'true' && cat.isNeutered === true) ||
      (f.neuteredFilter === 'false' && cat.isNeutered === false) ||
      (f.neuteredFilter === 'unknown' && cat.isNeutered === undefined);

    // Cats without the flag are treated as not adoptable.
    const matchesAdoptable =
      !f.adoptableFilter ||
      (f.adoptableFilter === 'true' && cat.adoptable === true) ||
      (f.adoptableFilter === 'false' && cat.adoptable !== true);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesLocation &&
      matchesGender &&
      matchesBirthYear &&
      matchesNeutered &&
      matchesAdoptable
    );
  });
}

/**
 * Type-aware sort over any `Cat` field. Returns a new array (does not mutate).
 * Numbers compare numerically, booleans false→true, everything else by
 * locale-aware string compare — matching the card view's original behaviour for
 * name / status / dwelling / date_of_birth.
 */
export function sortCats(cats: Cat[], sortKey: keyof Cat, order: 'asc' | 'desc'): Cat[] {
  const sorted = [...cats].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];

    let comparison = 0;
    if (typeof av === 'number' || typeof bv === 'number') {
      comparison = ((av as number) || 0) - ((bv as number) || 0);
    } else if (typeof av === 'boolean' || typeof bv === 'boolean') {
      comparison = (av ? 1 : 0) - (bv ? 1 : 0);
    } else {
      comparison = String(av || '').localeCompare(String(bv || ''));
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/** Unique non-empty dwelling values (current + previous), sorted ascending. */
export function getUniqueLocations(cats: Cat[]): string[] {
  return Array.from(
    new Set([
      ...cats.map((cat) => cat.dwelling).filter(Boolean),
      ...cats.map((cat) => cat.prev_dwelling).filter(Boolean),
    ])
  ).sort() as string[];
}

/** Unique non-empty status values, sorted ascending. */
export function getUniqueStatuses(cats: Cat[]): string[] {
  return Array.from(new Set(cats.map((cat) => cat.status).filter(Boolean))).sort() as string[];
}

/** Unique non-empty sex values, sorted ascending. */
export function getUniqueGenders(cats: Cat[]): string[] {
  return Array.from(new Set(cats.map((cat) => cat.sex).filter(Boolean))).sort() as string[];
}

/** Unique birth years, sorted descending (newest first). */
export function getUniqueBirthYears(cats: Cat[]): number[] {
  return Array.from(
    new Set(
      cats.map((cat) => cat.date_of_birth).filter((year): year is number => year !== undefined)
    )
  ).sort((a, b) => b - a);
}
