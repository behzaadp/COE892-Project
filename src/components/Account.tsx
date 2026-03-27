import React, { useEffect, useState } from 'react';
import { BorrowedItem, User, ReadingListItem } from '../types';
import { Book, Clock, AlertCircle, RefreshCw, CheckCircle2, User as UserIcon, Bookmark, Trash2 } from 'lucide-react';
import { fetchBorrowedItems, fetchUser, renewBorrowedItem, fetchReadingList, removeReadingList } from '../lib/api';

interface AccountProps {
  userId: string;
}

const Account: React.FC<AccountProps> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([]);
  const [readingList, setReadingList] = useState<ReadingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([fetchUser(userId), fetchBorrowedItems(userId), fetchReadingList(userId)])
      .then(([userData, borrowedData, listData]) => {
        if (!active) return;
        setUser(userData);
        setBorrowedItems(borrowedData);
        setReadingList(listData);
      })
      .catch((err) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load account data';
        setError(message);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [refreshKey, userId]);

  const retryLoad = () => {
    setRefreshKey((key) => key + 1);
  };

  const handleRenew = async (id: string) => {
    setActionMessage(null);
    setRenewingId(id);
    try {
      const updated = await renewBorrowedItem(id);
      setBorrowedItems((items) => items.map((item) => (item.id === id ? updated : item)));
      setActionMessage('Renewal successful. Due date extended by 14 days.');
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Unable to renew item right now.');
    } finally {
      setRenewingId(null);
    }
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString).getTime() < new Date().setHours(0, 0, 0, 0);
  };

  const getDaysRemaining = (dateString: string) => {
    const diffTime = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-76px)] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-library-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-76px)] flex items-center justify-center bg-red-50 px-4">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center max-w-md shadow-sm">
          <h2 className="text-2xl font-semibold text-red-700 mb-3">Unable to load account</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={retryLoad}
            className="px-6 py-2 rounded-lg bg-library-primary text-white font-semibold hover:bg-library-secondary transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-76px)] bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-5xl">
        {actionMessage && (
          <div className="mb-6 p-4 rounded-xl border text-sm font-medium bg-blue-50 border-blue-200 text-blue-800">
            {actionMessage}
          </div>
        )}

        {/* User Profile Card */}
        {user && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-library-accent opacity-10 rounded-bl-full -z-10" />
            <img
              src={user.avatar || 'https://placehold.co/128x128?text=User'}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg z-10"
            />
            <div className="text-center md:text-left z-10">
              <h1 className="text-4xl font-bold text-gray-900 font-serif mb-2">{user.name}</h1>
              <p className="text-gray-600 flex items-center justify-center md:justify-start gap-2 mb-2">
                <UserIcon className="h-5 w-5 text-library-secondary" /> {user.email}
              </p>
              <p className="text-sm font-medium text-library-primary bg-library-primary bg-opacity-10 inline-block px-3 py-1 rounded-full">
                Library Member since {new Date(user.memberSince).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Borrowed Items Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3 border-b pb-4">
            <Book className="h-7 w-7 text-library-primary" />
            Active Loans ({borrowedItems.length})
          </h2>

          <div className="grid grid-cols-1 gap-6">
            {borrowedItems.map((borrowed) => {
              const overdue = isOverdue(borrowed.dueDate);
              const daysRemaining = getDaysRemaining(borrowed.dueDate);
              const disableRenew = borrowed.renewals >= 3 || overdue || renewingId === borrowed.id;

              return (
                <div
                  key={borrowed.id}
                  className={`flex flex-col md:flex-row gap-6 p-6 rounded-xl border-2 ${
                    overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
                  } transition-all hover:shadow-md bg-white`}
                >
                  {borrowed.item.coverImage ? (
                    <img
                      src={borrowed.item.coverImage}
                      alt={borrowed.item.title}
                      className="w-32 h-48 object-cover rounded-lg shadow-md mx-auto md:mx-0"
                    />
                  ) : (
                    <div className="w-32 h-48 bg-gray-100 rounded-lg flex items-center justify-center mx-auto md:mx-0">
                      <Book className="h-10 w-10 text-gray-300" />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col md:flex-row justify-between items-start mb-2 gap-3">
                        <h3 className="text-xl font-bold text-gray-900">{borrowed.item.title}</h3>
                        {overdue ? (
                          <span className="flex items-center gap-1 text-red-700 text-sm font-bold bg-red-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                            <AlertCircle className="h-4 w-4" /> Overdue
                          </span>
                        ) : daysRemaining <= 3 ? (
                          <span className="flex items-center gap-1 text-yellow-700 text-sm font-bold bg-yellow-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                            <Clock className="h-4 w-4" /> Due in {daysRemaining} days
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-700 text-sm font-bold bg-green-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                            <CheckCircle2 className="h-4 w-4" /> In Good Standing
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 font-medium mb-6">by {borrowed.item.author}</p>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm bg-gray-50 p-4 rounded-lg">
                        <div>
                          <p className="text-gray-500 uppercase tracking-wide text-xs mb-1">Borrowed Date</p>
                          <p className="font-semibold text-gray-900">{new Date(borrowed.borrowDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 uppercase tracking-wide text-xs mb-1">Due Date</p>
                          <p className={`font-semibold ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
                            {new Date(borrowed.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 uppercase tracking-wide text-xs mb-1">Renewals Used</p>
                          <p className="font-semibold text-gray-900">{borrowed.renewals} / 3</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => handleRenew(borrowed.id)}
                        disabled={disableRenew}
                        className={`group flex items-center justify-center w-full md:w-auto gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                          disableRenew
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-library-primary text-white hover:bg-library-secondary shadow-sm hover:shadow-md'
                        }`}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${
                            !disableRenew && renewingId !== borrowed.id ? 'group-hover:rotate-180 transition-transform duration-500' : ''
                          }`}
                        />
                        {overdue ? 'Cannot Renew Overdue Item' : renewingId === borrowed.id ? 'Renewing...' : 'Renew Item'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {borrowedItems.length === 0 && (
              <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <Book className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Loans</h3>
                <p>You don't have any items checked out right now. Explore the catalog to find your next read!</p>
              </div>
            )}
          </div>
        </div>

        {/* Reading List Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3 border-b pb-4">
            <Bookmark className="h-7 w-7 text-library-secondary" />
            My Reading List ({readingList.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readingList.map((item) => (
              <div key={item.listId} className="flex gap-4 p-4 border rounded-xl hover:shadow-sm transition-shadow bg-white">
                {item.coverImage ? (
                  <img src={item.coverImage} alt={item.title} className="w-16 h-24 object-cover rounded shadow" />
                ) : (
                   <div className="w-16 h-24 bg-gray-100 rounded flex items-center justify-center"><Book className="text-gray-300"/></div>
                )}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">by {item.author}</p>
                    <p className="text-xs text-gray-400 mb-2">Added: {new Date(item.addedAt).toLocaleDateString()}</p>
                  </div>
                  
                  <button 
                    onClick={async () => {
                      try {
                        await removeReadingList(userId, item.id);
                        setReadingList(list => list.filter(l => l.id !== item.id));
                      } catch (e) { alert('Failed to remove from reading list'); }
                    }}
                    className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 font-medium w-fit"
                  >
                    <Trash2 className="w-4 h-4"/> Remove
                  </button>
                </div>
              </div>
            ))}

            {readingList.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <Bookmark className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p>Your reading list is empty.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;