import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariant = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 350 } },
  exit: { opacity: 0, scale: 0.97, y: 5, transition: { duration: 0.15 } },
};

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const widthMap = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={backdrop}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className={`relative bg-white rounded-2xl shadow-modal w-full ${widthMap[size]} max-h-[90vh] overflow-hidden`}
            variants={modalVariant}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h2 className="text-lg font-semibold text-surface-900">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors text-surface-400 hover:text-surface-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-80px)]">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
