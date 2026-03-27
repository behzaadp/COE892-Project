import React, { useEffect, useState } from 'react';
import { LibraryItem, SearchFilters } from '../types';
import SearchBar from './SearchBar';
import FilterSidebar from './FilterSidebar';
import BookCard from './BookCard';
import BookDetails from './BookDetails';
import { CatalogMetadata, fetchLibraryItems, fetchMetadata } from '../lib/api';

const fallbackMetadata: CatalogMetadata = {
  genres: ['All Genres'],
  formats: ['All Formats'],
  availabilityOptions: ['All Status']
};

interface CatalogProps {
  activeUserId: string | null;
  onRequireLogin: () => void;
}

const Catalog: React.FC<CatalogProps> = ({ activeUserId, onRequireLogin }) => {
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    format: '',
    genre: '',
    availability: ''
  });

  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<CatalogMetadata | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let active = true;
    fetchMetadata()
      .then((data) => {
        if (active) {
          setMetadata(data);
        }
      })
      .catch(() => {
        if (active) {
          setMetadataError('Unable to load filter metadata. Using defaults.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchLibraryItems(filters)
      .then((data) => {
        if (!cancelled) {
          setItems(data);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load catalog items');
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters, refreshTrigger]);

  const displayMetadata = metadata ?? fallbackMetadata;
  const hasItems = items.length > 0;
  const resultsCount = loading ? 0 : items.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-library-primary to-library-secondary text-white shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold font-serif mb-2">Automated Public Library System</h1>
              <p className="text-library-accent text-lg">Digital Catalog & Search Engine</p>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">Project 27</div>
              <div className="text-xs opacity-75">COE 892</div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <SearchBar
          searchTerm={filters.searchTerm}
          onSearchChange={(term) => setFilters({ ...filters, searchTerm: term })}
          resultsCount={resultsCount}
        />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-1/4 space-y-3">
            {metadataError && (
              <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                {metadataError}
              </p>
            )}
            <FilterSidebar
              filters={filters}
              onFilterChange={setFilters}
              genres={displayMetadata.genres}
              formats={displayMetadata.formats}
              availabilityOptions={displayMetadata.availabilityOptions}
            />
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-10 w-10 border-4 border-library-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Loading catalog items...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-red-50 border border-red-200 rounded-xl">
                <h3 className="text-xl font-semibold text-red-700 mb-2">Something went wrong</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => setFilters({ ...filters })}
                  className="text-sm font-semibold text-library-primary underline"
                >
                  Try again
                </button>
              </div>
            ) : !hasItems ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">??</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No items found</h3>
                <p className="text-gray-500">Try adjusting your search terms or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {items.map((item) => (
                  <BookCard
                    key={item.id}
                    item={item}
                    onItemClick={setSelectedItem}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Book Details Modal */}
      <BookDetails
        item={selectedItem}
        activeUserId={activeUserId}
        onRequireLogin={onRequireLogin}
        onSuccess={() => {
          setRefreshTrigger(prev => prev + 1);
          setSelectedItem(null);
        }}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default Catalog;