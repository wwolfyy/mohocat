'use client';

import { useState, useEffect, useRef } from 'react';
import { getCatService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { triggerCatRevalidate } from '@/lib/revalidate-client';
import { Cat } from '@/types';
import CatGrid from '@/components/admin/cat-grid/CatGrid';
import Button from '@/components/ui/Button';
import { adminStrings } from '@/constants/adminStrings';
import {
  filterCats,
  sortCats,
  getUniqueLocations,
  getUniqueStatuses,
  getUniqueGenders,
  getUniqueBirthYears,
} from '@/utils/cat-filters';
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiSave,
  FiX,
  FiChevronUp,
  FiChevronDown,
  FiFilter,
} from 'react-icons/fi';

interface CatFormData {
  name: string;
  alt_name: string;
  description: string;
  thumbnailUrl: string;
  dwelling: string;
  prev_dwelling: string;
  date_of_birth: number | undefined;
  dob_certainty: string;
  sex: string;
  status: string;
  character: string;
  sickness: string;
  parents: string;
  offspring: string;
  isNeutered: boolean | undefined;
  note: string;
  adoptable: boolean;
  adoption_info: string;
  name_origin: string;
}

const initialFormData: CatFormData = {
  name: '',
  alt_name: '',
  description: '',
  thumbnailUrl: '',
  dwelling: '',
  prev_dwelling: '',
  date_of_birth: undefined,
  dob_certainty: '',
  sex: '',
  status: '',
  character: '',
  sickness: '',
  parents: '',
  offspring: '',
  isNeutered: undefined,
  note: '',
  adoptable: false,
  adoption_info: '',
  name_origin: '',
};

export default function CatsCMSPage() {
  const catService = getCatService();
  const { user } = useAuth();

  const [view, setView] = useState<'card' | 'grid'>('card');
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Cat | null>(null);
  const [formData, setFormData] = useState<CatFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Dropdown states
  const [dwellingDropdownOpen, setDwellingDropdownOpen] = useState(false);
  const [prevDwellingDropdownOpen, setPrevDwellingDropdownOpen] = useState(false);

  // Refs for click outside handling
  const dwellingRef = useRef<HTMLDivElement>(null);
  const prevDwellingRef = useRef<HTMLDivElement>(null);

  // Sorting and filtering states
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'dwelling' | 'date_of_birth'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [birthYearFilter, setBirthYearFilter] = useState<string>('');
  const [neuteredFilter, setNeuteredFilter] = useState<string>('');
  const [adoptableFilter, setAdoptableFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Unique values for the filter dropdowns (shared with the grid view).
  const uniqueLocations = getUniqueLocations(cats);
  const uniqueStatuses = getUniqueStatuses(cats);
  const uniqueGenders = getUniqueGenders(cats);
  const uniqueBirthYears = getUniqueBirthYears(cats);

  const neuteredOptions = [
    { value: 'true', label: 'O (중성화됨)' },
    { value: 'false', label: 'X (중성화 안됨)' },
    { value: 'unknown', label: '? (알 수 없음)' },
  ];

  // Dwelling autocomplete options for the form (same set as the location filter).
  const allDwellingValues = uniqueLocations;

  // Filter + sort via the shared util so both views stay in sync.
  const filteredCats = sortCats(
    filterCats(cats, {
      searchTerm,
      statusFilter,
      locationFilter,
      genderFilter,
      birthYearFilter,
      neuteredFilter,
      adoptableFilter,
    }),
    sortBy,
    sortOrder
  );

  // Handle sorting
  const handleSort = (field: 'name' | 'status' | 'dwelling' | 'date_of_birth') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setLocationFilter('');
    setGenderFilter('');
    setBirthYearFilter('');
    setNeuteredFilter('');
    setAdoptableFilter('');
    setSortBy('name');
    setSortOrder('asc');
  };

  // Load cats data
  useEffect(() => {
    loadCats();
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dwellingRef.current && !dwellingRef.current.contains(event.target as Node)) {
        setDwellingDropdownOpen(false);
      }
      if (prevDwellingRef.current && !prevDwellingRef.current.contains(event.target as Node)) {
        setPrevDwellingDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadCats = async () => {
    try {
      setLoading(true);
      setError(null);
      const catsData = await catService.getAllCats();
      setCats(catsData);
    } catch (err: any) {
      setError(adminStrings.cats.errors.loadFailed(err.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      // Convert form data to Cat format
      const catData = {
        ...formData,
        isNeutered: formData.isNeutered,
      };

      if (editingCat) {
        // Update existing cat
        await catService.updateCat(editingCat.id, catData);
        setCats(cats.map((cat) => (cat.id === editingCat.id ? { ...cat, ...catData } : cat)));
      } else {
        // Create new cat
        const newCat = await catService.createCat(catData);
        setCats([...cats, newCat]);
      }

      // §7a: refresh the baked public pages so the edit reflects immediately.
      await triggerCatRevalidate(user);

      // Reset form
      setFormData(initialFormData);
      setShowForm(false);
      setEditingCat(null);
    } catch (err: any) {
      setError(adminStrings.cats.errors.saveFailed(err.message));
    } finally {
      setSaving(false);
    }
  };

  // Handle edit
  const handleEdit = (cat: Cat) => {
    setEditingCat(cat);
    setFormData({
      name: cat.name || '',
      alt_name: cat.alt_name || '',
      description: cat.description || '',
      thumbnailUrl: cat.thumbnailUrl || '',
      dwelling: cat.dwelling || '',
      prev_dwelling: cat.prev_dwelling || '',
      date_of_birth: cat.date_of_birth || undefined,
      dob_certainty: cat.dob_certainty || '',
      sex: cat.sex || '',
      status: cat.status || '',
      character: cat.character || '',
      sickness: cat.sickness || '',
      parents: cat.parents || '',
      offspring: cat.offspring || '',
      isNeutered: cat.isNeutered,
      note: cat.note || '',
      adoptable: cat.adoptable ?? false,
      adoption_info: cat.adoption_info || '',
      name_origin: cat.name_origin || '',
    });
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (catId: string) => {
    try {
      setError(null);
      await catService.deleteCat(catId);
      setCats(cats.filter((cat) => cat.id !== catId));
      setDeleteConfirm(null);
      // §7a: refresh the baked public pages so the deletion reflects immediately.
      await triggerCatRevalidate(user);
    } catch (err: any) {
      setError(adminStrings.cats.errors.deleteFailed(err.message));
    }
  };

  // Handle new cat
  const handleNewCat = () => {
    setEditingCat(null);
    setFormData(initialFormData);
    setShowForm(true);
  };

  // Handle cancel
  const handleCancel = () => {
    setShowForm(false);
    setEditingCat(null);
    setFormData(initialFormData);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{adminStrings.cats.title}</h1>
        <p className="text-gray-600">{adminStrings.cats.subtitle}</p>
      </div>

      {/* View tabs: card/form editor (existing) vs. spreadsheet grid */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setView('card')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            view === 'card'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {adminStrings.cats.tabs.card}
        </button>
        <button
          onClick={() => setView('grid')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            view === 'grid'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {adminStrings.cats.tabs.grid}
        </button>
      </div>

      {view === 'grid' ? (
        <CatGrid />
      ) : (
        <>
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={adminStrings.cats.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <FiFilter /> {adminStrings.cats.filtersToggle}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleNewCat} className="gap-2">
                <FiPlus /> {adminStrings.cats.addNew}
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {adminStrings.cats.filters.status}
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">{adminStrings.cats.filters.allStatuses}</option>
                    {uniqueStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {adminStrings.cats.filters.location}
                  </label>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">{adminStrings.cats.filters.allLocations}</option>
                    {uniqueLocations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {adminStrings.cats.filters.gender}
                  </label>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">{adminStrings.cats.filters.allGenders}</option>
                    {uniqueGenders.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender === 'M' ? '남' : gender === 'F' ? '여' : gender}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {adminStrings.cats.filters.birthYear}
                  </label>
                  <select
                    value={birthYearFilter}
                    onChange={(e) => setBirthYearFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">{adminStrings.cats.filters.allYears}</option>
                    {uniqueBirthYears.map((year) => (
                      <option key={year} value={year.toString()}>
                        {year}년
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {adminStrings.cats.filters.neutering}
                  </label>
                  <select
                    value={neuteredFilter}
                    onChange={(e) => setNeuteredFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">{adminStrings.cats.filters.all}</option>
                    {neuteredOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {adminStrings.cats.filters.adoptable}
                  </label>
                  <select
                    value={adoptableFilter}
                    onChange={(e) => setAdoptableFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">{adminStrings.cats.filters.all}</option>
                    <option value="true">{adminStrings.cats.filters.adoptableYes}</option>
                    <option value="false">{adminStrings.cats.filters.adoptableNo}</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={clearFilters}>
                  {adminStrings.cats.filters.clear}
                </Button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{cats.length}</div>
              <div className="text-sm text-gray-600">{adminStrings.cats.stats.total}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {cats.filter((cat) => cat.status === '산냥이').length}
              </div>
              <div className="text-sm text-gray-600">{adminStrings.cats.stats.mountain}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{filteredCats.length}</div>
              <div className="text-sm text-gray-600">{adminStrings.cats.stats.filtered}</div>
            </div>
          </div>

          {/* Cat Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    {editingCat
                      ? adminStrings.cats.form.editTitle
                      : adminStrings.cats.form.addTitle}
                  </h2>
                  <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
                    <FiX size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {adminStrings.cats.form.name} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {adminStrings.cats.form.altName}
                      </label>
                      <input
                        type="text"
                        value={formData.alt_name}
                        onChange={(e) => setFormData({ ...formData, alt_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {adminStrings.cats.form.sex}
                      </label>
                      <select
                        value={formData.sex}
                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                      >
                        <option value="">{adminStrings.cats.form.selectPlaceholder}</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                        <option value="U">U</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {adminStrings.cats.form.status}
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                      >
                        <option value="">{adminStrings.cats.form.selectPlaceholder}</option>
                        <option value="산냥이">산냥이</option>
                        <option value="쉼터냥이">쉼터냥이</option>
                        <option value="집냥이">집냥이</option>
                        <option value="별냥이">별냥이</option>
                        <option value="행방불명">행방불명</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {adminStrings.cats.form.birthYear}
                      </label>
                      <input
                        type="number"
                        value={formData.date_of_birth || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({
                            ...formData,
                            date_of_birth: value ? parseInt(value, 10) : undefined,
                          });
                        }}
                        placeholder={adminStrings.cats.form.birthYearPlaceholder}
                        min="1990"
                        max="2030"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {adminStrings.cats.form.birthYearCertainty}
                      </label>
                      <select
                        value={formData.dob_certainty}
                        onChange={(e) =>
                          setFormData({ ...formData, dob_certainty: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                      >
                        <option value="">{adminStrings.cats.form.selectPlaceholder}</option>
                        <option value="certain">{adminStrings.cats.form.certain}</option>
                        <option value="uncertain">{adminStrings.cats.form.uncertain}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {adminStrings.cats.form.thumbnailUrl}
                      </label>
                      <input
                        type="url"
                        value={formData.thumbnailUrl}
                        onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {adminStrings.cats.form.currentDwelling}
                      </label>
                      <div className="relative" ref={dwellingRef}>
                        <input
                          type="text"
                          value={formData.dwelling}
                          onChange={(e) => setFormData({ ...formData, dwelling: e.target.value })}
                          onFocus={() => setDwellingDropdownOpen(true)}
                          placeholder={adminStrings.cats.form.dwellingPlaceholder}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                        />
                        <button
                          type="button"
                          onClick={() => setDwellingDropdownOpen(!dwellingDropdownOpen)}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {dwellingDropdownOpen ? (
                            <FiChevronUp size={16} />
                          ) : (
                            <FiChevronDown size={16} />
                          )}
                        </button>
                        {dwellingDropdownOpen && allDwellingValues.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {allDwellingValues
                              .filter(
                                (dwelling) =>
                                  formData.dwelling === '' ||
                                  dwelling.toLowerCase().includes(formData.dwelling.toLowerCase())
                              )
                              .map((dwelling) => (
                                <button
                                  key={dwelling}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, dwelling });
                                    setDwellingDropdownOpen(false);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                                >
                                  {dwelling}
                                </button>
                              ))}
                            {allDwellingValues.filter(
                              (dwelling) =>
                                formData.dwelling === '' ||
                                dwelling.toLowerCase().includes(formData.dwelling.toLowerCase())
                            ).length === 0 &&
                              formData.dwelling && (
                                <div className="px-3 py-2 text-gray-500 italic">
                                  {adminStrings.cats.form.noMatches}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {adminStrings.cats.form.previousDwelling}
                      </label>
                      <div className="relative" ref={prevDwellingRef}>
                        <input
                          type="text"
                          value={formData.prev_dwelling}
                          onChange={(e) =>
                            setFormData({ ...formData, prev_dwelling: e.target.value })
                          }
                          onFocus={() => setPrevDwellingDropdownOpen(true)}
                          placeholder={adminStrings.cats.form.dwellingPlaceholder}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                        />
                        <button
                          type="button"
                          onClick={() => setPrevDwellingDropdownOpen(!prevDwellingDropdownOpen)}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {prevDwellingDropdownOpen ? (
                            <FiChevronUp size={16} />
                          ) : (
                            <FiChevronDown size={16} />
                          )}
                        </button>
                        {prevDwellingDropdownOpen && allDwellingValues.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {allDwellingValues
                              .filter(
                                (dwelling) =>
                                  formData.prev_dwelling === '' ||
                                  dwelling
                                    .toLowerCase()
                                    .includes(formData.prev_dwelling.toLowerCase())
                              )
                              .map((dwelling) => (
                                <button
                                  key={dwelling}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, prev_dwelling: dwelling });
                                    setPrevDwellingDropdownOpen(false);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                                >
                                  {dwelling}
                                </button>
                              ))}
                            {allDwellingValues.filter(
                              (dwelling) =>
                                formData.prev_dwelling === '' ||
                                dwelling
                                  .toLowerCase()
                                  .includes(formData.prev_dwelling.toLowerCase())
                            ).length === 0 &&
                              formData.prev_dwelling && (
                                <div className="px-3 py-2 text-gray-500 italic">
                                  {adminStrings.cats.form.noMatches}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {adminStrings.cats.form.description}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {adminStrings.cats.form.nameOrigin}
                    </label>
                    <textarea
                      value={formData.name_origin}
                      onChange={(e) => setFormData({ ...formData, name_origin: e.target.value })}
                      rows={3}
                      placeholder={adminStrings.cats.form.nameOriginPlaceholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {adminStrings.cats.form.character}
                    </label>
                    <textarea
                      value={formData.character}
                      onChange={(e) => setFormData({ ...formData, character: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {adminStrings.cats.form.sickness}
                    </label>
                    <textarea
                      value={formData.sickness}
                      onChange={(e) => setFormData({ ...formData, sickness: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {adminStrings.cats.form.parents}
                      </label>
                      <input
                        type="text"
                        value={formData.parents}
                        onChange={(e) => setFormData({ ...formData, parents: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {adminStrings.cats.form.offspring}
                      </label>
                      <input
                        type="text"
                        value={formData.offspring}
                        onChange={(e) => setFormData({ ...formData, offspring: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {adminStrings.cats.form.neutering}
                    </label>
                    <select
                      value={
                        formData.isNeutered === true
                          ? 'true'
                          : formData.isNeutered === false
                            ? 'false'
                            : ''
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          isNeutered:
                            value === 'true' ? true : value === 'false' ? false : undefined,
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                    >
                      <option value="">{adminStrings.cats.form.neuteringUnknown}</option>
                      <option value="true">{adminStrings.cats.form.neuteringYes}</option>
                      <option value="false">{adminStrings.cats.form.neuteringNo}</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.adoptable}
                        onChange={(e) => setFormData({ ...formData, adoptable: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-300"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {adminStrings.cats.form.adoptableLabel}
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {adminStrings.cats.form.adoptionInfo}
                    </label>
                    <textarea
                      value={formData.adoption_info}
                      onChange={(e) => setFormData({ ...formData, adoption_info: e.target.value })}
                      rows={4}
                      placeholder={adminStrings.cats.form.adoptionInfoPlaceholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {adminStrings.cats.form.note}
                    </label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      rows={4}
                      placeholder={adminStrings.cats.form.notePlaceholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={handleCancel}>
                      {adminStrings.common.cancel}
                    </Button>
                    <Button type="submit" disabled={saving} className="gap-2">
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ink"></div>
                          {adminStrings.common.saving}
                        </>
                      ) : (
                        <>
                          <FiSave /> {adminStrings.cats.form.saveCat}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Cats Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        {adminStrings.cats.table.cat}
                        {sortBy === 'name' &&
                          (sortOrder === 'asc' ? (
                            <FiChevronUp size={14} />
                          ) : (
                            <FiChevronDown size={14} />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('date_of_birth')}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        {adminStrings.cats.table.details}
                        {sortBy === 'date_of_birth' &&
                          (sortOrder === 'asc' ? (
                            <FiChevronUp size={14} />
                          ) : (
                            <FiChevronDown size={14} />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('dwelling')}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        {adminStrings.cats.table.location}
                        {sortBy === 'dwelling' &&
                          (sortOrder === 'asc' ? (
                            <FiChevronUp size={14} />
                          ) : (
                            <FiChevronDown size={14} />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        {adminStrings.cats.table.status}
                        {sortBy === 'status' &&
                          (sortOrder === 'asc' ? (
                            <FiChevronUp size={14} />
                          ) : (
                            <FiChevronDown size={14} />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {adminStrings.cats.table.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCats.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {cat.thumbnailUrl ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={cat.thumbnailUrl}
                                alt={cat.name}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-500 text-sm">{cat.name.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{cat.name}</div>
                            {cat.alt_name && (
                              <div className="text-sm text-gray-500">{cat.alt_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {/* Combined gender, birth year, and neutering status in Korean format */}
                          {(cat.sex || cat.date_of_birth || cat.isNeutered !== undefined) && (
                            <div className="mb-1">
                              {cat.sex && (
                                <span>
                                  {cat.sex === 'M' ? '남' : cat.sex === 'F' ? '여' : cat.sex}
                                </span>
                              )}
                              {(cat.date_of_birth || cat.isNeutered !== undefined) && (
                                <span>
                                  {' '}
                                  (
                                  {cat.date_of_birth &&
                                    `${cat.date_of_birth}${adminStrings.cats.table.bornSuffix}`}
                                  {cat.date_of_birth && cat.isNeutered !== undefined && ', '}
                                  {cat.isNeutered !== undefined &&
                                    `${adminStrings.cats.table.neuteringPrefix} ${cat.isNeutered === true ? 'O' : cat.isNeutered === false ? 'X' : '?'}`}
                                  )
                                </span>
                              )}
                            </div>
                          )}
                          {/* Description on the second line */}
                          {cat.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {cat.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {cat.dwelling && (
                            <div>
                              {adminStrings.cats.table.current}: {cat.dwelling}
                            </div>
                          )}
                          {cat.prev_dwelling && (
                            <div className="text-gray-500">
                              {adminStrings.cats.table.previous}: {cat.prev_dwelling}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full ${
                              cat.status === '산냥이'
                                ? 'bg-green-100 text-green-800'
                                : cat.status === '쉼터냥이'
                                  ? 'bg-amber-100 text-amber-800'
                                  : cat.status === '집냥이'
                                    ? 'bg-blue-100 text-blue-800'
                                    : cat.status === '별냥이'
                                      ? 'bg-gray-100 text-gray-800'
                                      : cat.status === '행방불명'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {cat.status || adminStrings.cats.table.unknownStatus}
                          </span>
                          {cat.adoptable && (
                            <span className="inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full bg-brand-100 text-brand-800">
                              입양 가능
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(cat)}
                            className="text-gray-500 hover:text-ink"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(cat.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredCats.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchTerm ||
                  statusFilter ||
                  locationFilter ||
                  genderFilter ||
                  birthYearFilter ||
                  neuteredFilter ||
                  adoptableFilter
                    ? adminStrings.cats.table.emptyFiltered
                    : adminStrings.cats.table.empty}
                </p>
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">{adminStrings.cats.delete.title}</h3>
                <p className="text-gray-600 mb-6">{adminStrings.cats.delete.body}</p>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                    {adminStrings.common.cancel}
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>
                    {adminStrings.cats.delete.confirm}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
