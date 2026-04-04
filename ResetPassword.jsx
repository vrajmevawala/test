import React, { useState } from 'react';
import { toast } from 'react-toastify';

const ResetPassword = ({ token, onBack }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid or missing token.');
      return;
    }
    if (!password) {
      toast.error('Password is required.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');
      toast.success(data.message || 'Password reset successful!');
      // Close modal and redirect to home
      onBack();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If no token, show error message
  if (!token) {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="w-full flex flex-col items-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Invalid Reset Link</h2>
          <p className="text-gray-500 text-sm mb-6">This reset link is invalid or has expired.</p>
        </div>
        <div className="w-full text-center mt-4 text-sm text-gray-500">
          <button type="button" className="text-black font-medium hover:underline" onClick={onBack}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h2>
        <p className="text-gray-500 text-sm mb-6">Enter your new password below.</p>
      </div>
      <form className="w-full space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            id="password"
            type="password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:outline-none"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:outline-none"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-black text-white rounded-md shadow-sm hover:bg-gray-800 transition text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:ring-black"
          disabled={loading || !token}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      <div className="w-full text-center mt-4 text-sm text-gray-500">
        <button type="button" className="text-black font-medium hover:underline" onClick={onBack}>
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPassword; 