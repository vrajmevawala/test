import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { toast } from 'react-toastify';

const LoginForm = ({ onLogin, onBack, onForgotPassword, onGoogleAuth, onSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in to EduVerse</h2>
        <p className="text-gray-500 text-sm mb-6">Welcome back! Please sign in to continue</p>
      </div>
      <div className="w-full flex flex-col items-center gap-3">
        <button
          type="button"
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 transition"
          onClick={onGoogleAuth}
        >
          <FcGoogle size={20} />
          Sign in with Google
        </button>
      </div>
      <div className="flex items-center w-full my-4">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="mx-3 text-xs text-gray-400">or</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>
      <form className="w-full space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:outline-none"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:outline-none"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-gray-400" />
              ) : (
                <Eye className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-black border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 text-sm text-gray-900">
              Remember me
            </label>
          </div>
          <button
            type="button"
            className="text-black hover:text-gray-700 focus:outline-none text-sm"
            onClick={onForgotPassword}
          >
            Forgot your password?
          </button>
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-black text-white rounded-md shadow-sm hover:bg-gray-800 transition text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:ring-black"
        >
          Sign In
        </button>
      </form>
      <div className="w-full text-center mt-4 text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <button type="button" className="text-black font-medium hover:underline" onClick={onSignUp}>
          Sign up
        </button>
      </div>
    </div>
  );
};

export default LoginForm; 