export const seedLibraryItems = [
  {
    id: '1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    genre: 'Classic Literature',
    format: 'book',
    status: 'available',
    description: 'A classic novel of the Jazz Age, exploring themes of idealism, resistance to change, social upheaval, and excess.',
    publishedDate: '1925-04-10',
    location: 'Fiction Section A',
    isbn: '9780743273565',
    pages: 180,
    language: 'English',
    coverImage: 'https://images.unsplash.com/photo-1615413833480-6e8427dbcc5e?w=400&h=600&fit=crop'
  },
  {
    id: '2',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    genre: 'Classic Literature',
    format: 'book',
    status: 'checked-out',
    description: 'A gripping tale of racial injustice and childhood innocence in the American South.',
    publishedDate: '1960-07-11',
    location: 'Fiction Section B',
    isbn: '9780061120084',
    pages: 281,
    language: 'English',
    coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop'
  },
  {
    id: '3',
    title: '1984',
    author: 'George Orwell',
    genre: 'Dystopian Fiction',
    format: 'book',
    status: 'available',
    description: 'A dystopian social science fiction novel that examines totalitarianism and thought control.',
    publishedDate: '1949-06-08',
    location: 'Fiction Section C',
    isbn: '9780451524935',
    pages: 328,
    language: 'English',
    coverImage: 'https://images.unsplash.com/photo-1622609184693-58079bb6742f?w=400&h=600&fit=crop'
  },
  {
    id: '4',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    genre: 'Romance',
    format: 'book',
    status: 'on-hold',
    description: 'A romantic novel that charts the emotional development of protagonist Elizabeth Bennet.',
    publishedDate: '1813-01-28',
    location: 'Classic Literature Section',
    isbn: '9780141439518',
    pages: 432,
    language: 'English',
    coverImage: 'https://images.unsplash.com/photo-1657209956208-479abaebbfa3?w=400&h=600&fit=crop'
  },
  {
    id: '5',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    genre: 'Fantasy',
    format: 'book',
    status: 'available',
    description: 'A fantasy novel about the adventures of hobbit Bilbo Baggins in Middle-earth.',
    publishedDate: '1937-09-21',
    location: 'Fantasy Section A',
    isbn: '9780547928227',
    pages: 310,
    language: 'English',
    coverImage: 'https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?w=400&h=600&fit=crop'
  },
  {
    id: '6',
    title: "Harry Potter and the Philosopher's Stone",
    author: 'J.K. Rowling',
    genre: 'Fantasy',
    format: 'book',
    status: 'checked-out',
    description: "The first novel in the Harry Potter series, following Harry's discovery of his magical heritage.",
    publishedDate: '1997-06-26',
    location: 'Young Adult Section',
    isbn: '9780747532699',
    pages: 223,
    language: 'English',
    coverImage: 'https://images.unsplash.com/photo-1771712969766-b50d5cba6d96?w=400&h=600&fit=crop'
  },
  {
    id: '7',
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    author: 'J.R.R. Tolkien',
    genre: 'Fantasy',
    format: 'audiobook',
    status: 'available',
    description: 'The first volume of The Lord of the Rings, beginning the epic quest to destroy the One Ring.',
    publishedDate: '1954-07-29',
    location: 'Audiobook Section',
    isbn: '9780395489314',
    pages: 423,
    language: 'English',
    coverImage: 'https://images.unsplash.com/photo-1618845072579-853968656c0e?w=400&h=600&fit=crop'
  },
  {
    id: '8',
    title: 'The Shawshank Redemption',
    author: 'Stephen King',
    genre: 'Drama',
    format: 'dvd',
    status: 'available',
    description: 'A DVD of the acclaimed film adaptation about hope and friendship in prison.',
    publishedDate: '1994-09-23',
    location: 'DVD Section A',
    language: 'English',
    coverImage: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=400&h=600&fit=crop'
  },
  {
    id: '9',
    title: 'Dune',
    author: 'Frank Herbert',
    genre: 'Science Fiction',
    format: 'book',
    status: 'available',
    description: 'A science fiction novel set in the distant future amidst a feudal interstellar society.',
    publishedDate: '1965-08-01',
    location: 'Sci-Fi Section A',
    isbn: '9780441172719',
    pages: 412,
    language: 'English',
    coverImage: 'https://images.unsplash.com/photo-1506773090264-ac0b07293a64?w=400&h=600&fit=crop'
  },
  {
    id: '10',
    title: 'National Geographic: Wildlife Special',
    author: 'National Geographic',
    genre: 'Nature',
    format: 'magazine',
    status: 'available',
    description: 'Special edition magazine featuring stunning wildlife photography and articles.',
    publishedDate: '2024-01-15',
    location: 'Magazine Rack',
    language: 'English',
    coverImage: 'https://images.unsplash.com/photo-1623880132570-ab1b4297c8c2?w=400&h=600&fit=crop'
  }
];

export const seedUser = {
  id: 'u1',
  name: 'John Doe',
  email: 'john.doe@torontolibrary.ca',
  password: 'password123',
  memberSince: '2023-01-15',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
};

const today = new Date();
const twoDaysFromNow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)
  .toISOString()
  .split('T')[0];

export const seedBorrowedItems = [
  {
    id: 'b1',
    itemId: '2',
    userId: 'u1',
    borrowDate: '2024-03-01',
    dueDate: '2024-03-15',
    renewals: 0
  },
  {
    id: 'b2',
    itemId: '6',
    userId: 'u1',
    borrowDate: '2024-02-20',
    dueDate: twoDaysFromNow,
    renewals: 1
  },
  {
    id: 'b3',
    itemId: '7',
    userId: 'u1',
    borrowDate: '2024-01-10',
    dueDate: '2024-01-24',
    renewals: 3
  }
];
