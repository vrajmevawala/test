import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Modal = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl relative w-full max-w-md mx-4 flex flex-col items-center p-0"
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-black text-2xl font-bold focus:outline-none"
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
            <div className="w-full px-8 py-4 flex flex-col items-center">
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal; 