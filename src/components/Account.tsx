// src/components/Account.tsx
import React, { useState } from 'react';
import { BorrowedItem } from '../types';
import { mockUser, mockBorrowedItems } from '../data/mockData';
import { Book, Clock, AlertCircle, RefreshCw, CheckCircle2, User } from 'lucide-react';

const Account: React.FC = () => {
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>(mockBorrowedItems);

  // Functionality to renew an item (extends date by 14 days)
  const handleRenew = (id: string) => {
    setBorrowedItems(items => items.map(item => {
      if (item.id === id) {
        const currentDue = new Date(item.dueDate);
        const newDue = new Date(currentDue.setDate(currentDue.getDate() + 14));
        return {
          ...item,
          dueDate: newDue.toISOString().split('T')[0],
          renewals: item.renewals + 1
        };
      }
      return item;
    }));
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString).getTime() < new Date().setHours(0,0,0,0);
  };

  const getDaysRemaining = (dateString: string) => {
    const diffTime = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-[calc(100vh-76px)] bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-5xl">
        
        {/* User Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-library-accent opacity-10 rounded-bl-full -z-10"></div>
          <img 
            src={mockUser.avatar} 
            alt="Profile" 
            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg z-10"
          />
          <div className="text-center md:text-left z-10">
            <h1 className="text-4xl font-bold text-gray-900 font-serif mb-2">{mockUser.name}</h1>
            <p className="text-gray-600 flex items-center justify-center md:justify-start gap-2 mb-2">
              <User className="h-5 w-5 text-library-secondary" /> {mockUser.email}
            </p>
            <p className="text-sm font-medium text-library-primary bg-library-primary bg-opacity-10 inline-block px-3 py-1 rounded-full">
              Library Member since {new Date(mockUser.memberSince).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Borrowed Items Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3 border-b pb-4">
            <Book className="h-7 w-7 text-library-primary" />
            Active Loans ({borrowedItems.length})
          </h2>

          <div className="grid grid-cols-1 gap-6">
            {borrowedItems.map(borrowed => {
              const overdue = isOverdue(borrowed.dueDate);
              const daysRemaining = getDaysRemaining(borrowed.dueDate);
              
              return (
                <div key={borrowed.id} className={`flex flex-col md:flex-row gap-6 p-6 rounded-xl border-2 ${overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100'} transition-all hover:shadow-md bg-white`}>
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
                          <p className="text-gray-500 uppercase tracking-wide text-xs mb-1">Renewals Left</p>
                          <p className="font-semibold text-gray-900">{3 - borrowed.renewals}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <button 
                        onClick={() => handleRenew(borrowed.id)}
                        disabled={borrowed.renewals >= 3 || overdue}
                        className={`flex items-center justify-center w-full md:w-auto gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                          borrowed.renewals >= 3 || overdue 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                            : 'bg-library-primary text-white hover:bg-library-secondary shadow-sm hover:shadow-md'
                        }`}
                      >
                        <RefreshCw className={`h-4 w-4 ${borrowed.renewals < 3 && !overdue ? 'group-hover:rotate-180 transition-transform duration-500' : ''}`} />
                        {overdue ? 'Cannot Renew Overdue Item' : 'Renew Item'}
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
      </div>
    </div>
  );
};

export default Account;