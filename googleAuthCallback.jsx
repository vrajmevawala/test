import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const GoogleAuthCallback = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const hasStartedRef = useRef(false);
  
  useEffect(() => {
    // Prevent multiple executions using ref
    if (hasStartedRef.current || isProcessing || isCompleted) {
      return;
    }

    // Google returns token in hash fragment
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const id_token = params.get('id_token') || params.get('access_token');
    
    if (id_token) {
      hasStartedRef.current = true;
      setIsProcessing(true);
      
      fetch('/api/auth/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token }),
        credentials: 'include',
      })
        .then(async res => {
          const data = await res.json();
          
          if (!res.ok) throw new Error(data.message || 'Google Auth failed');
          
          if (data && data.token && data.user) {
            localStorage.setItem('jwt', data.token);
            setIsCompleted(true);
            onAuthSuccess(data.user);
            
            // Navigate to dashboard after successful auth
            setTimeout(() => {
              navigate('/dashboard');
            }, 100);
          } else {
            alert('Google Auth failed.');
            navigate('/login');
          }
        })
        .catch((error) => {
          alert('Google Auth failed.');
          navigate('/login');
        });
    } else {
      // Only show error if we're not in a redirect flow
      if (hash && hash.length > 0) {
      alert('No Google token found.');
      navigate('/login');
    }
    }
  }, [navigate, onAuthSuccess, isProcessing, isCompleted]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
        <p>Signing you in with Google...</p>
        {isCompleted && (
          <p className="text-sm text-green-600 mt-2">✅ Authentication successful! Redirecting...</p>
        )}
      </div>
    </div>
  );
};

export default GoogleAuthCallback;