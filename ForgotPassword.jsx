import React, { useState } from 'react';
import { toast } from 'react-toastify';

const ForgotPassword = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send reset link');
      toast.success(data.message || 'Password reset link sent!');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Forgot Password</h2>
        <p className="text-gray-500 text-sm mb-6">Enter your email to receive a password reset link.</p>
      </div>
      <form className="w-full space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:outline-none"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-black text-white rounded-md shadow-sm hover:bg-gray-800 transition text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:ring-black"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword; 