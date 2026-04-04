import { motion } from 'framer-motion';

export function SkeletonLine({ className = '' }) {
  return (
    <motion.div
      className={`bg-surface-200 rounded-lg ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-surface-100 p-5 space-y-4">
      <SkeletonLine className="h-4 w-1/3" />
      <SkeletonLine className="h-8 w-2/3" />
      <SkeletonLine className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
      <div className="grid gap-4 p-4 border-b border-surface-100" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} className="h-4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 p-4 border-b border-surface-50" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}
