export interface LibraryItem {
    id: string;
    title: string;
    author: string;
    genre: string;
    format: 'book' | 'dvd' | 'audiobook' | 'magazine';
    status: 'available' | 'checked-out' | 'on-hold';
    description: string;
    publishedDate: string;
    location: string;
    isbn?: string;
    coverImage?: string;
    pages?: number;
    language: string;
  }
  
  export interface SearchFilters {
    searchTerm: string;
    format: string;
    genre: string;
    availability: string;
  }

  export interface User {
  id: string;
  name: string;
  email: string;
  memberSince: string;
  avatar?: string;
}

export interface BorrowedItem {
  id: string;
  item: LibraryItem;
  borrowDate: string;
  dueDate: string;
  renewals: number;
}