import { motion } from 'framer-motion';
import { getStatusColor, statusDisplayLabel, cn } from '../../utils/helpers';

export default function StatusBadge({ status, size = 'sm' }) {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        getStatusColor(status),
        sizeClasses[size]
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-60" />
      {statusDisplayLabel(status)}
    </motion.span>
  );
}
