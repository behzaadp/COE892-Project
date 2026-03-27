import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Library, User } from 'lucide-react';
import { registerUser } from '../lib/api';

interface SignupProps {
  onSignup: (userId: string) => void;
  onNavigateLogin: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSignup, onNavigateLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (name && email && password) {
        const user = await registerUser({ name, email, password });
        onSignup(user.id); // Log them in automatically
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up. Please try again.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-76px)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center">
          <div className="bg-library-light p-4 rounded-full mb-4">
            <Library className="h-10 w-10 text-library-primary" />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 font-serif">
            Create an Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join the library to borrow books and manage holds.
          </p>
        </div>
        
        {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg">{error}</div>}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-library-primary focus:border-transparent transition-shadow"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email-address"
                  type="email"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-library-primary focus:border-transparent transition-shadow"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-library-primary focus:border-transparent transition-shadow"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-library-primary hover:bg-library-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-library-primary transition-all shadow-md hover:shadow-lg"
            >
              Sign Up
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="text-sm text-center">
            <span className="text-gray-600">Already have an account? </span>
            <button type="button" onClick={onNavigateLogin} className="font-medium text-library-secondary hover:text-library-primary transition-colors">
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;