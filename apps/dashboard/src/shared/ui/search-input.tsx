import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

/** Search box that reports its value 300 ms after typing stops. */
export function SearchInput({ value, onChange, label, placeholder }: { value?: string; onChange: (q: string | undefined) => void; label: string; placeholder: string }) {
  const [text, setText] = useState(value ?? '');

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = text.trim() || undefined;
      if (next !== value) onChange(next);
    }, 300);
    return () => window.clearTimeout(id);
  }, [text, value, onChange]);

  return (
    <label className="relative block w-full max-w-sm">
      <span className="sr-only">{label}</span>
      <Search size={16} aria-hidden className="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-control border border-border bg-surface py-2 pr-3 pl-9 text-sm"
      />
    </label>
  );
}
