import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';

export default function KPICard({ label, value, icon: Icon, suffix = '', trend, index = 0 }) {
  return (
    <motion.div
      className="bg-white rounded-2xl border border-surface-100 p-5 shadow-glass hover:shadow-card transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-surface-400">{label}</span>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-surface-50 flex items-center justify-center">
            <Icon size={18} className="text-surface-500" />
          </div>
        )}
      </div>
      <div className="flex items-end gap-1.5">
        <AnimatedCounter value={value} />
        {suffix && <span className="text-sm font-medium text-surface-400 mb-0.5">{suffix}</span>}
      </div>
      {trend !== undefined && (
        <span
          className={cn(
            'text-xs font-medium mt-2 inline-block',
            trend >= 0 ? 'text-emerald-600' : 'text-red-500'
          )}
        >
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </motion.div>
  );
}

function AnimatedCounter({ value }) {
  const display = typeof value === 'string' ? value : (value ?? 0).toLocaleString();
  return (
    <motion.span
      className="text-2xl font-bold text-surface-900 tracking-tight"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      key={display}
    >
      {display}
    </motion.span>
  );
}
