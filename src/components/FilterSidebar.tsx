import React from 'react';
import { Filter } from 'lucide-react';
import { SearchFilters } from '../types';

interface FilterSidebarProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  genres: string[];
  formats: string[];
  availabilityOptions: string[];
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, onFilterChange, genres, formats, availabilityOptions }) => {
  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  const isAllValue = (value: string) => value.toLowerCase().startsWith('all');
  const formatLabel = (value: string) => value.replace('-', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit">
      <div className="flex items-center gap-2 mb-6">
        <Filter className="h-5 w-5 text-library-primary" />
        <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
      </div>

      {/* Format Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Format
        </label>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-library-primary focus:border-transparent"
          value={filters.format}
          onChange={(e) => handleFilterChange('format', e.target.value)}
        >
          {formats.map((format) => (
            <option key={format} value={isAllValue(format) ? '' : format}>
              {formatLabel(format)}
            </option>
          ))}
        </select>
      </div>

      {/* Genre Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Genre
        </label>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-library-primary focus:border-transparent"
          value={filters.genre}
          onChange={(e) => handleFilterChange('genre', e.target.value)}
        >
          {genres.map((genre) => (
            <option key={genre} value={isAllValue(genre) ? '' : genre}>
              {genre}
            </option>
          ))}
        </select>
      </div>

      {/* Availability Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Availability
        </label>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-library-primary focus:border-transparent"
          value={filters.availability}
          onChange={(e) => handleFilterChange('availability', e.target.value)}
        >
          {availabilityOptions.map((option) => (
            <option key={option} value={isAllValue(option) ? '' : option}>
              {formatLabel(option)}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Filters */}
      <button
        onClick={() => onFilterChange({
          searchTerm: filters.searchTerm,
          format: '',
          genre: '',
          availability: ''
        })}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors duration-200 font-medium"
      >
        Reset Filters
      </button>
    </div>
  );
};

export default FilterSidebar;
