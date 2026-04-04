import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No data found', message = 'Nothing to display at the moment.', icon: Icon = Inbox, action }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
        <Icon size={24} className="text-surface-400" />
      </div>
      <h3 className="text-base font-semibold text-surface-800 mb-1">{title}</h3>
      <p className="text-sm text-surface-400 text-center max-w-xs">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
