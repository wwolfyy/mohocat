"use client";

import { useState, useEffect, useRef } from "react";
import { getCatService } from "@/services";
import { Cat } from "@/types";
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiSave, FiX, FiChevronUp, FiChevronDown, FiFilter } from "react-icons/fi";

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
}

const initialFormData: CatFormData = {
  name: "",
  alt_name: "",
  description: "",
  thumbnailUrl: "",
  dwelling: "",
  prev_dwelling: "",
  date_of_birth: undefined,
  dob_certainty: "",
  sex: "",
  status: "",
  character: "",
  sickness: "",
  parents: "",
  offspring: "",
  isNeutered: undefined,
  note: "",
};

export default function CatsCMSPage() {
  const catService = getCatService();

  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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
  const [showFilters, setShowFilters] = useState(false);

  // Get unique locations and statuses for filters
  const uniqueLocations = Array.from(new Set([
    ...cats.map(cat => cat.dwelling).filter(Boolean),
    ...cats.map(cat => cat.prev_dwelling).filter(Boolean)
  ])).sort();

  const uniqueStatuses = Array.from(new Set(
    cats.map(cat => cat.status).filter(Boolean)
  )).sort();

  // Get unique values for new filters
  const uniqueGenders = Array.from(new Set(
    cats.map(cat => cat.sex).filter(Boolean)
  )).sort();

  const uniqueBirthYears = Array.from(new Set(
    cats.map(cat => cat.date_of_birth).filter((year): year is number => year !== undefined)
  )).sort((a, b) => b - a); // Sort years in descending order

  const neuteredOptions = [
    { value: 'true', label: 'O (중성화됨)' },
    { value: 'false', label: 'X (중성화 안됨)' },
    { value: 'unknown', label: '? (알 수 없음)' }
  ];

  // Get unique dwelling values for dropdown options
  const allDwellingValues = Array.from(new Set([
    ...cats.map(cat => cat.dwelling).filter(Boolean),
    ...cats.map(cat => cat.prev_dwelling).filter(Boolean)
  ])).sort() as string[];

  // Filter and sort cats
  const filteredCats = cats
    .filter(cat => {
      // Search filter
      const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.alt_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.character?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.parents?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.offspring?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.dob_certainty?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = !statusFilter || cat.status === statusFilter;

      // Location filter
      const matchesLocation = !locationFilter ||
        cat.dwelling === locationFilter ||
        cat.prev_dwelling === locationFilter;

      // Gender filter
      const matchesGender = !genderFilter || cat.sex === genderFilter;

      // Birth year filter
      const matchesBirthYear = !birthYearFilter ||
        cat.date_of_birth?.toString() === birthYearFilter;

      // Neutered filter
      const matchesNeutered = !neuteredFilter ||
        (neuteredFilter === 'true' && cat.isNeutered === true) ||
        (neuteredFilter === 'false' && cat.isNeutered === false) ||
        (neuteredFilter === 'unknown' && cat.isNeutered === undefined);

      return matchesSearch && matchesStatus && matchesLocation &&
             matchesGender && matchesBirthYear && matchesNeutered;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'dwelling':
          comparison = (a.dwelling || '').localeCompare(b.dwelling || '');
          break;
        case 'date_of_birth':
          const dateA = a.date_of_birth || 0;
          const dateB = b.date_of_birth || 0;
          comparison = dateA - dateB;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

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
      setError("Failed to load cats: " + err.message);
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
        isNeutered: formData.isNeutered
      };

      if (editingCat) {
        // Update existing cat
        await catService.updateCat(editingCat.id, catData);
        setCats(cats.map(cat =>
          cat.id === editingCat.id
            ? { ...cat, ...catData }
            : cat
        ));
      } else {
        // Create new cat
        const newCat = await catService.createCat(catData);
        setCats([...cats, newCat]);
      }

      // Reset form
      setFormData(initialFormData);
      setShowForm(false);
      setEditingCat(null);
    } catch (err: any) {
      setError("Failed to save cat: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle edit
  const handleEdit = (cat: Cat) => {
    setEditingCat(cat);
    setFormData({
      name: cat.name || "",
      alt_name: cat.alt_name || "",
      description: cat.description || "",
      thumbnailUrl: cat.thumbnailUrl || "",
      dwelling: cat.dwelling || "",
      prev_dwelling: cat.prev_dwelling || "",
      date_of_birth: cat.date_of_birth || undefined,
      dob_certainty: cat.dob_certainty || "",
      sex: cat.sex || "",
      status: cat.status || "",
      character: cat.character || "",
      sickness: cat.sickness || "",
      parents: cat.parents || "",
      offspring: cat.offspring || "",
      isNeutered: cat.isNeutered,
      note: cat.note || "",
    });
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (catId: string) => {
    try {
      setError(null);
      await catService.deleteCat(catId);
      setCats(cats.filter(cat => cat.id !== catId));
      setDeleteConfirm(null);
    } catch (err: any) {
      setError("Failed to delete cat: " + err.message);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Cat Management System
        </h1>
        <p className="text-gray-600">
          Manage cat information directly in Firestore. All changes are saved immediately to the database.
        </p>
      </div>

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
              placeholder="Search cats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FiFilter /> Filters
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNewCat}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus /> Add New Cat
          </button>

          {/* Data Migration Button */}
          <button
            onClick={async () => {
              const confirmed = confirm("This will migrate all cats' neutering status from strings to booleans. Continue?");
              if (!confirmed) return;

              try {
                let migratedCount = 0;
                const catsToMigrate = cats.filter(cat =>
                  typeof (cat.isNeutered as any) === 'string'
                );

                console.log(`Found ${catsToMigrate.length} cats to migrate`);

                for (const cat of catsToMigrate) {
                  let newIsNeutered: boolean | undefined;
                  const currentValue = cat.isNeutered as any; // Type assertion to handle legacy string data

                  if (currentValue === "TRUE" || currentValue === "true") {
                    newIsNeutered = true;
                  } else if (currentValue === "FALSE" || currentValue === "false") {
                    newIsNeutered = false;
                  } else {
                    newIsNeutered = undefined;
                  }

                  console.log(`Migrating ${cat.name}: "${currentValue}" → ${newIsNeutered}`);

                  await catService.updateCat(cat.id, { isNeutered: newIsNeutered });
                  migratedCount++;
                }

                alert(`Successfully migrated ${migratedCount} cats!`);
                loadCats(); // Reload the data
              } catch (err) {
                console.error("Migration failed:", err);
                alert("Migration failed: " + err);
              }
            }}
            className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
          >
            🔄 Migrate Neutering Data
          </button>

          {/* Date of Birth Migration Button */}
          <button
            onClick={async () => {
              const confirmed = confirm("This will migrate all cats' date_of_birth from strings to numbers. Continue?");
              if (!confirmed) return;

              try {
                let migratedCount = 0;
                const catsToMigrate = cats.filter(cat =>
                  typeof (cat.date_of_birth as any) === 'string' && (cat.date_of_birth as any).trim() !== ""
                );

                console.log(`Found ${catsToMigrate.length} cats to migrate date_of_birth`);

                for (const cat of catsToMigrate) {
                  const currentValue = cat.date_of_birth as any as string; // Type assertion for legacy data
                  const numericValue = parseInt(currentValue.trim(), 10);

                  if (!isNaN(numericValue) && numericValue > 1990 && numericValue < 2030) {
                    console.log(`Migrating ${cat.name}: "${currentValue}" → ${numericValue}`);
                    await catService.updateCat(cat.id, { date_of_birth: numericValue });
                    migratedCount++;
                  } else {
                    console.log(`Skipping ${cat.name}: invalid date "${currentValue}"`);
                  }
                }

                alert(`Successfully migrated ${migratedCount} cats' birth dates!`);
                loadCats(); // Reload the data
              } catch (err) {
                console.error("Date migration failed:", err);
                alert("Date migration failed: " + err);
              }
            }}
            className="px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
          >
            📅 Migrate Birth Dates
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Location
              </label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                {uniqueLocations.map(location => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Gender
              </label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Genders</option>
                {uniqueGenders.map(gender => (
                  <option key={gender} value={gender}>
                    {gender === 'M' ? '남 (Male)' : gender === 'F' ? '여 (Female)' : gender}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Birth Year
              </label>
              <select
                value={birthYearFilter}
                onChange={(e) => setBirthYearFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Years</option>
                {uniqueBirthYears.map(year => (
                  <option key={year} value={year.toString()}>
                    {year}년
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Neutering
              </label>
              <select
                value={neuteredFilter}
                onChange={(e) => setNeuteredFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {neuteredOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{cats.length}</div>
          <div className="text-sm text-gray-600">Total Cats</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {cats.filter(cat => cat.status === "산냥이").length}
          </div>
          <div className="text-sm text-gray-600">산냥이 (Mountain Cats)</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {filteredCats.length}
          </div>
          <div className="text-sm text-gray-600">Filtered Results</div>
        </div>
      </div>

      {/* Cat Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingCat ? "Edit Cat" : "Add New Cat"}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alternative Name
                  </label>
                  <input
                    type="text"
                    value={formData.alt_name}
                    onChange={(e) => setFormData({...formData, alt_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sex
                  </label>
                  <select
                    value={formData.sex}
                    onChange={(e) => setFormData({...formData, sex: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                    <option value="U">U</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="산냥이">산냥이</option>
                    <option value="집냥이">집냥이</option>
                    <option value="별냥이">별냥이</option>
                    <option value="행방불명">행방불명</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birth Year
                  </label>
                  <input
                    type="number"
                    value={formData.date_of_birth || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        date_of_birth: value ? parseInt(value, 10) : undefined
                      });
                    }}
                    placeholder="e.g., 2020"
                    min="1990"
                    max="2030"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birth Year Certainty
                  </label>
                  <select
                    value={formData.dob_certainty}
                    onChange={(e) => setFormData({...formData, dob_certainty: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="certain">Certain</option>
                    <option value="uncertain">Uncertain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thumbnail URL
                  </label>
                  <input
                    type="url"
                    value={formData.thumbnailUrl}
                    onChange={(e) => setFormData({...formData, thumbnailUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Dwelling
                  </label>
                  <div className="relative" ref={dwellingRef}>
                    <input
                      type="text"
                      value={formData.dwelling}
                      onChange={(e) => setFormData({...formData, dwelling: e.target.value})}
                      onFocus={() => setDwellingDropdownOpen(true)}
                      placeholder="Select from list or type new dwelling..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setDwellingDropdownOpen(!dwellingDropdownOpen)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {dwellingDropdownOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </button>
                    {dwellingDropdownOpen && allDwellingValues.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {allDwellingValues
                          .filter(dwelling =>
                            formData.dwelling === '' ||
                            dwelling.toLowerCase().includes(formData.dwelling.toLowerCase())
                          )
                          .map((dwelling) => (
                            <button
                              key={dwelling}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, dwelling});
                                setDwellingDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                            >
                              {dwelling}
                            </button>
                          ))}
                        {allDwellingValues.filter(dwelling =>
                          formData.dwelling === '' ||
                          dwelling.toLowerCase().includes(formData.dwelling.toLowerCase())
                        ).length === 0 && formData.dwelling && (
                          <div className="px-3 py-2 text-gray-500 italic">No matches found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Previous Dwelling
                  </label>
                  <div className="relative" ref={prevDwellingRef}>
                    <input
                      type="text"
                      value={formData.prev_dwelling}
                      onChange={(e) => setFormData({...formData, prev_dwelling: e.target.value})}
                      onFocus={() => setPrevDwellingDropdownOpen(true)}
                      placeholder="Select from list or type new dwelling..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setPrevDwellingDropdownOpen(!prevDwellingDropdownOpen)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {prevDwellingDropdownOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </button>
                    {prevDwellingDropdownOpen && allDwellingValues.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {allDwellingValues
                          .filter(dwelling =>
                            formData.prev_dwelling === '' ||
                            dwelling.toLowerCase().includes(formData.prev_dwelling.toLowerCase())
                          )
                          .map((dwelling) => (
                            <button
                              key={dwelling}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, prev_dwelling: dwelling});
                                setPrevDwellingDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                            >
                              {dwelling}
                            </button>
                          ))}
                        {allDwellingValues.filter(dwelling =>
                          formData.prev_dwelling === '' ||
                          dwelling.toLowerCase().includes(formData.prev_dwelling.toLowerCase())
                        ).length === 0 && formData.prev_dwelling && (
                          <div className="px-3 py-2 text-gray-500 italic">No matches found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Character/Personality
                </label>
                <textarea
                  value={formData.character}
                  onChange={(e) => setFormData({...formData, character: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Health/Sickness Notes
                </label>
                <textarea
                  value={formData.sickness}
                  onChange={(e) => setFormData({...formData, sickness: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parents/Mother
                  </label>
                  <input
                    type="text"
                    value={formData.parents}
                    onChange={(e) => setFormData({...formData, parents: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Offspring/Children
                  </label>
                  <input
                    type="text"
                    value={formData.offspring}
                    onChange={(e) => setFormData({...formData, offspring: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Neutering Status
                </label>
                <select
                  value={formData.isNeutered === true ? "true" : formData.isNeutered === false ? "false" : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      isNeutered: value === "true" ? true : value === "false" ? false : undefined
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">? (Unknown)</option>
                  <option value="true">O (Neutered/Spayed)</option>
                  <option value="false">X (Not Neutered)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Notes
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  rows={4}
                  placeholder="Any special notes or remarks about this cat..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiSave /> Save Cat
                    </>
                  )}
                </button>
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
                    Cat
                    {sortBy === 'name' && (
                      sortOrder === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('date_of_birth')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Details
                    {sortBy === 'date_of_birth' && (
                      sortOrder === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('dwelling')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Location
                    {sortBy === 'dwelling' && (
                      sortOrder === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Status
                    {sortBy === 'status' && (
                      sortOrder === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
                            <span className="text-gray-500 text-sm">
                              {cat.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {cat.name}
                        </div>
                        {cat.alt_name && (
                          <div className="text-sm text-gray-500">
                            {cat.alt_name}
                          </div>
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
                              {' '}(
                              {cat.date_of_birth && `${cat.date_of_birth}년 생`}
                              {cat.date_of_birth && cat.isNeutered !== undefined && ', '}
                              {cat.isNeutered !== undefined && `중성화 ${cat.isNeutered === true ? "O" : cat.isNeutered === false ? "X" : "?"}`}
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
                      {cat.dwelling && <div>Current: {cat.dwelling}</div>}
                      {cat.prev_dwelling && (
                        <div className="text-gray-500">Previous: {cat.prev_dwelling}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full ${
                      cat.status === "산냥이" ? "bg-green-100 text-green-800" :
                      cat.status === "집냥이" ? "bg-blue-100 text-blue-800" :
                      cat.status === "별냥이" ? "bg-gray-100 text-gray-800" :
                      cat.status === "행방불명" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {cat.status || "Unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="text-blue-600 hover:text-blue-800"
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
              {searchTerm || statusFilter || locationFilter || genderFilter || birthYearFilter || neuteredFilter
                ? "No cats found matching your filters."
                : "No cats found."}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this cat? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
