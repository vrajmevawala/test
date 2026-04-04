import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Layers, Filter, ArrowUpDown } from 'lucide-react';

/* ───── Legacy exports (used on Dashboard) ───── */
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-300" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-surface-200 rounded-xl
          focus:outline-none focus:ring-2 focus:ring-surface-900/10 focus:border-surface-300
          placeholder:text-surface-300 transition-all"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-300 hover:text-surface-500">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function SelectFilter({ value, onChange, options, placeholder = 'All', label }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-surface-400">{label}</span>}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2.5 text-sm bg-white border border-surface-200 rounded-xl appearance-none
          focus:outline-none focus:ring-2 focus:ring-surface-900/10 focus:border-surface-300
          text-surface-700 transition-all cursor-pointer min-w-[140px]"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ───── Pill dropdown (internal) ───── */
function PillDropdown({ label, icon: Icon, options, value, onChange, multi = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasValue = multi ? (value && value.length > 0) : !!value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`toolbar-pill ${hasValue ? 'active' : ''}`}
      >
        <Icon size={14} />
        <span>{label}</span>
        {hasValue && <span className="pill-dot" />}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="toolbar-dropdown">
          {options.map((opt) => {
            const optVal = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            const isSelected = multi
              ? (value || []).includes(optVal)
              : value === optVal;

            return (
              <label key={optVal} className={isSelected ? 'selected' : ''}>
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={label}
                  checked={isSelected}
                  onChange={() => {
                    if (multi) {
                      const arr = value || [];
                      onChange(isSelected ? arr.filter((v) => v !== optVal) : [...arr, optVal]);
                    } else {
                      onChange(isSelected ? '' : optVal);
                      setOpen(false);
                    }
                  }}
                  className="sr-only"
                />
                <span className={`w-4 h-4 rounded-md border-2 flex items-center justify-center text-[10px]
                  ${isSelected
                    ? 'border-surface-900 bg-surface-900 text-white'
                    : 'border-surface-300 bg-white'
                  }`}>
                  {isSelected && '✓'}
                </span>
                <span>{optLabel}</span>
              </label>
            );
          })}

          {hasValue && (
            <button
              type="button"
              onClick={() => { onChange(multi ? [] : ''); setOpen(false); }}
              className="w-full mt-1 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors text-center"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ───── TOOLBAR — the main new component ───── */
/**
 * @param {string}   search          - search text
 * @param {function} onSearchChange  - setter for search
 * @param {string}   searchPlaceholder
 * @param {Array}    filterOptions   - [{ value, label }]
 * @param {string}   filterValue     - current filter value
 * @param {function} onFilterChange
 * @param {Array}    sortOptions     - [{ value, label }]
 * @param {string}   sortValue
 * @param {function} onSortChange
 * @param {Array}    groupOptions    - [{ value, label }]
 * @param {string}   groupValue
 * @param {function} onGroupChange
 */
export function Toolbar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterOptions = [],
  filterValue = '',
  onFilterChange,
  sortOptions = [],
  sortValue = '',
  onSortChange,
  groupOptions = [],
  groupValue = '',
  onGroupChange,
}) {
  return (
    <div className="toolbar">
      {/* Search bar */}
      {onSearchChange && (
        <div className="toolbar-search">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
          {search && (
            <button onClick={() => onSearchChange('')} className="clear-btn">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Pill buttons */}
      <div className="toolbar-pills">
        {groupOptions.length > 0 && onGroupChange && (
          <PillDropdown
            label="Group by"
            icon={Layers}
            options={groupOptions}
            value={groupValue}
            onChange={onGroupChange}
          />
        )}

        {filterOptions.length > 0 && onFilterChange && (
          <PillDropdown
            label="Filter"
            icon={Filter}
            options={filterOptions}
            value={filterValue}
            onChange={onFilterChange}
          />
        )}

        {sortOptions.length > 0 && onSortChange && (
          <PillDropdown
            label="Sort by"
            icon={ArrowUpDown}
            options={sortOptions}
            value={sortValue}
            onChange={onSortChange}
          />
        )}
      </div>
    </div>
  );
}
