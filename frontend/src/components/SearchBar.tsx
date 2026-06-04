import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search by title, tags, or description...',
}: SearchBarProps) {
  return (
    <div className="relative group">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sortai-slate group-focus-within:text-sortai-silver transition-colors" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-sortai-jet/50 border border-sortai-slate/20
                   text-sm text-sortai-pale placeholder:text-sortai-slate/60
                   focus:outline-none focus:border-sortai-slate/50 focus:bg-sortai-jet
                   transition-all duration-200"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-sortai-slate hover:text-sortai-pale
                     hover:bg-sortai-white/5 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
