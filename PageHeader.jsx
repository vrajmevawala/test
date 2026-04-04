import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';

export default function PageHeader({ title, subtitle, children, className }) {
  return (
    <motion.div
      className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6', className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-surface-400 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </motion.div>
  );
}
