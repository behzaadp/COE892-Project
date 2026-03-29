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
  role?: string;
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

export interface ReadingListItem extends LibraryItem {
  listId: string;
  addedAt: string;
}

export interface AdminBorrowedItem {
  id: string;
  userId: string;
  borrowDate: string;
  dueDate: string;
  renewals: number;
  user: {
    name: string;
    email: string;
  };
  item: {
    id: string;
    title: string;
    author: string;
    coverImage?: string;
  };
}

export interface HoldItem {
  id: string;
  holdDate: string;
  item: {
    id: string;
    title: string;
    author: string;
    coverImage?: string;
    status: string;
  };
}

export interface AdminHoldItem extends HoldItem {
  user: { name: string; email: string; };
}

export interface Notification {
  id: string;
  userId: string;
  type:
  | 'DUE_TODAY'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'HOLD_PLACED'
  | 'HOLD_REMOVED'
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_OVERDUE';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
