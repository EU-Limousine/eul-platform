'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { PlaceSuggestionDto } from '@eul/api-client';
import { placeDetails, searchPlaces } from './api';
import type { Place } from './draft';
import { fieldClass } from './ui';

const newSession = () => crypto.randomUUID().replace(/-/g, '');

/** Address search through our API (Google Places on the server). Keyboard: ↑ ↓ Enter Esc. */
export function PlaceInput({
  id,
  label,
  value,
  onChange,
  error,
  tone = 'light',
}: {
  id: string;
  label: string;
  value?: Place;
  onChange: (place: Place | undefined) => void;
  error?: string;
  /** "dark" for the hero booking forms on dark backgrounds. */
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  const t = useTranslations('booking.journey');
  const locale = useLocale();
  const listId = useId();
  const [text, setText] = useState(value?.address ?? '');
  const [suggestions, setSuggestions] = useState<PlaceSuggestionDto[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [failed, setFailed] = useState(false);
  const session = useRef(newSession());

  useEffect(() => setText(value?.address ?? ''), [value?.address]);

  // Search 250 ms after typing stops; cancel older requests.
  useEffect(() => {
    if (value && text === value.address) return;
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchPlaces(text.trim(), session.current, locale, controller.signal)
        .then((found) => {
          setSuggestions(found);
          setActive(-1);
          setOpen(true);
          setFailed(false);
        })
        .catch(() => !controller.signal.aborted && setFailed(true));
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [text, value, locale]);

  async function choose(s: PlaceSuggestionDto) {
    setOpen(false);
    setText(s.mainText);
    try {
      const place = await placeDetails(s.placeId, session.current, locale);
      onChange(place);
      setText(place.address);
    } catch {
      setFailed(true);
    } finally {
      session.current = newSession(); // a session ends with the details call
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      const s = suggestions[active];
      if (s) void choose(s);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const shownError = error ?? (failed ? t('searchFailed') : undefined);

  return (
    <div className="relative space-y-1.5">
      <label htmlFor={id} className={dark ? 'block text-xs font-medium text-site-on-dark-muted' : 'block text-sm font-medium text-text'}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={!!shownError}
        aria-describedby={shownError ? `${id}-error` : undefined}
        placeholder={t('addressPlaceholder')}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (value) onChange(undefined); // typing again clears the chosen place
        }}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && !value && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className={
          dark
            ? 'w-full rounded-control border border-site-line-dark bg-site-dark-3 px-3 py-2.5 text-sm text-site-on-dark placeholder:text-site-on-dark-muted'
            : fieldClass
        }
      />
      {open && suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 w-full overflow-hidden rounded-control border border-border bg-surface shadow-lg">
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                void choose(s);
              }}
              className={`cursor-pointer px-3 py-2.5 ${i === active ? 'bg-canvas' : 'hover:bg-canvas'}`}
            >
              <span className="block text-sm font-medium text-text">{s.mainText}</span>
              {s.secondaryText && <span className="block text-xs text-text-muted">{s.secondaryText}</span>}
            </li>
          ))}
        </ul>
      )}
      {open && suggestions.length === 0 && text.trim().length >= 2 && !failed && (
        <p className="text-xs text-text-muted">{t('noResults')}</p>
      )}
      {shownError && (
        <p id={`${id}-error`} role="alert" className={dark ? 'text-sm text-site-gold' : 'text-sm text-danger'}>
          {shownError}
        </p>
      )}
    </div>
  );
}
