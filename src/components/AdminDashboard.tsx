import React, { useEffect, useState } from 'react';
import { User, AdminBorrowedItem, AdminHoldItem } from '../types';
import { Shield, Book, User as UserIcon, CheckCircle, RefreshCw, Package, XCircle } from 'lucide-react';
import { fetchAllBorrowedItems, returnBorrowedItem, fetchAllHolds, removeAdminHold } from '../lib/api';

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [borrowedItems, setBorrowedItems] = useState<AdminBorrowedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [holds, setHolds] = useState<AdminHoldItem[]>([]);

  useEffect(() => {
    Promise.all([fetchAllBorrowedItems(), fetchAllHolds()]) // Fetch both
      .then(([borrowedData, holdsData]) => {
        setBorrowedItems(borrowedData);
        setHolds(holdsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRemoveHold = async (holdId: string) => {
    try {
      setProcessingId(holdId);
      await removeAdminHold(holdId);
      setHolds(items => items.filter(item => item.id !== holdId));
    } catch (error: any) { alert('Failed to remove hold'); }
    finally { setProcessingId(null); }
  };

  const handleReturn = async (borrowedId: string) => {
    try {
      setProcessingId(borrowedId);
      await returnBorrowedItem(borrowedId);
      // Remove the item from the UI list once successfully returned
      setBorrowedItems(items => items.filter(item => item.id !== borrowedId));
    } catch (error: any) {
      alert(error.message || 'Failed to process return');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-76px)] flex justify-center items-center">
        <div className="animate-spin h-10 w-10 border-4 border-library-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-76px)] bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Admin Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 flex items-center gap-6">
          <div className="bg-library-primary p-4 rounded-full text-white">
            <Shield className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-serif">Admin Dashboard</h1>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              Welcome back, {user.name} ({user.email})
            </p>
          </div>
        </div>

        {/* Global Borrowed Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3 border-b pb-4">
            <Book className="h-6 w-6 text-library-primary" />
            Global Active Loans ({borrowedItems.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Item Details</th>
                  <th className="p-4 font-semibold">Borrower</th>
                  <th className="p-4 font-semibold">Dates</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {borrowedItems.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    
                    {/* Item Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        {record.item.coverImage ? (
                          <img src={record.item.coverImage} alt="cover" className="w-12 h-16 object-cover rounded shadow-sm" />
                        ) : (
                          <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center"><Book className="text-gray-400 w-5 h-5"/></div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900">{record.item.title}</p>
                          <p className="text-sm text-gray-500">{record.item.author}</p>
                        </div>
                      </div>
                    </td>

                    {/* Borrower Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{record.user.name}</span>
                      </div>
                      <span className="text-sm text-gray-500 ml-6">{record.user.email}</span>
                    </td>

                    {/* Dates */}
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-500 w-16">Borrowed:</span>
                          <span className="font-medium">{new Date(record.borrowDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-16">Due:</span>
                          <span className="font-medium text-red-600">{new Date(record.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleReturn(record.id)}
                        disabled={processingId === record.id}
                        className="inline-flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {processingId === record.id ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Processing</>
                        ) : (
                          <><CheckCircle className="w-4 h-4" /> Mark as Returned</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}

                {borrowedItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      <CheckCircle className="w-12 h-12 text-green-200 mx-auto mb-3" />
                      <p className="text-lg font-medium">All items are currently available.</p>
                      <p className="text-sm">No active loans found across the system.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        {/* Global Active Holds */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3 border-b pb-4">
            <Package className="h-6 w-6 text-yellow-600" />
            Global Active Holds ({holds.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Item Details</th>
                  <th className="p-4 font-semibold">Held For</th>
                  <th className="p-4 font-semibold">Hold Date</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {holds.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        {record.item.coverImage ? (
                          <img src={record.item.coverImage} className="w-12 h-16 object-cover rounded shadow-sm" />
                        ) : (
                          <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center"><Book className="text-gray-400 w-5 h-5"/></div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900">{record.item.title}</p>
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">On Hold</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{record.user.name}</span>
                      </div>
                      <span className="text-sm text-gray-500 ml-6">{record.user.email}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-gray-900">{new Date(record.holdDate).toLocaleDateString()}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRemoveHold(record.id)}
                        disabled={processingId === record.id}
                        className="inline-flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {processingId === record.id ? 'Processing...' : <><XCircle className="w-4 h-4" /> Remove Hold</>}
                      </button>
                    </td>
                  </tr>
                ))}
                {holds.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-lg font-medium">No items are currently on hold.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
