import { BorrowedItem, LibraryItem, ReadingListItem, SearchFilters, User, AdminBorrowedItem, AdminHoldItem, HoldItem } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export interface CatalogMetadata {
  genres: string[];
  formats: string[];
  availabilityOptions: string[];
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }
  return response.json() as Promise<T>;
}

function buildQuery(filters: SearchFilters): string {
  const params = new URLSearchParams();
  if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);
  if (filters.genre) params.append('genre', filters.genre);
  if (filters.format) params.append('format', filters.format);
  if (filters.availability) params.append('availability', filters.availability);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function fetchLibraryItems(filters: SearchFilters): Promise<LibraryItem[]> {
  const response = await fetch(`${API_BASE_URL}/library-items${buildQuery(filters)}`);
  return handleResponse<LibraryItem[]>(response);
}

export async function fetchMetadata(): Promise<CatalogMetadata> {
  const response = await fetch(`${API_BASE_URL}/metadata`);
  return handleResponse<CatalogMetadata>(response);
}

export async function fetchUser(userId: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`);
  return handleResponse<User>(response);
}

export async function fetchBorrowedItems(userId: string): Promise<BorrowedItem[]> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/borrowed-items`);
  return handleResponse<BorrowedItem[]>(response);
}

export async function renewBorrowedItem(id: string): Promise<BorrowedItem> {
  const response = await fetch(`${API_BASE_URL}/borrowed/${id}/renew`, {
    method: 'POST'
  });
  return handleResponse<BorrowedItem>(response);
}

export async function registerUser(userData: any): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return handleResponse<User>(response);
}

export async function loginUser(credentials: any): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  return handleResponse<User>(response);
}

export async function borrowLibraryItem(itemId: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/library-items/${itemId}/borrow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!response.ok) throw new Error(await response.text());
}

export async function addReadingList(userId: string, itemId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/reading-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId })
  });
  if (!response.ok) throw new Error(await response.text());
}

export async function removeReadingList(userId: string, itemId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/reading-list/${itemId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await response.text());
}

export async function fetchReadingList(userId: string): Promise<ReadingListItem[]> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/reading-list`);
  return handleResponse<ReadingListItem[]>(response);
}

export async function fetchAllBorrowedItems(): Promise<AdminBorrowedItem[]> {
  const response = await fetch(`${API_BASE_URL}/admin/borrowed-items`);
  return handleResponse<AdminBorrowedItem[]>(response);
}

export async function returnBorrowedItem(borrowedId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/return/${borrowedId}`, { method: 'POST' });
  if (!response.ok) throw new Error(await response.text());
}

export async function placeAdminHold(itemId: string, userEmail: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/holds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, userEmail })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to place hold');
  }
}

export async function removeAdminHold(holdId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/holds/${holdId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await response.text());
}

export async function fetchUserHolds(userId: string): Promise<HoldItem[]> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/holds`);
  return handleResponse<HoldItem[]>(response);
}

export async function fetchAllHolds(): Promise<AdminHoldItem[]> {
  const response = await fetch(`${API_BASE_URL}/admin/holds`);
  return handleResponse<AdminHoldItem[]>(response);
}