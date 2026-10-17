import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  parsePlaceDetails,
  placeDetails,
  placesAutocomplete,
  type ParsedPlace,
  type PlacePrediction,
} from '../api/maps';

type Props = {
  value: string;
  onChange: (text: string) => void;
  onPlaceSelected: (place: ParsedPlace) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Set false to hide the built-in "Where?" label. */
  showLabel?: boolean;
};

function newSessionToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = 'Enter city, airport or address',
  disabled,
  showLabel = true,
}: Props) {
  const listId = useId();
  const inputId = `${listId}-input`;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const sessionRef = useRef(newSessionToken());
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const q = value.trim();
    if (q.length < 2) {
      setPredictions([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const rows = await placesAutocomplete(q, sessionRef.current);
        setPredictions(rows);
        setOpen(rows.length > 0);
        // Leave highlight unset until ArrowDown / hover so first ↓ picks the top result.
        setActiveIndex(-1);
      } catch {
        setPredictions([]);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value]);

  const selectPrediction = async (row: PlacePrediction) => {
    onChange(row.description);
    setOpen(false);
    setPredictions([]);
    setActiveIndex(-1);
    try {
      const details = await placeDetails(row.place_id, sessionRef.current);
      onPlaceSelected(parsePlaceDetails(details, row.description));
    } catch {
      onPlaceSelected(parsePlaceDetails(null, row.description));
    }
    sessionRef.current = newSessionToken();
  };

  const listOpen = open && predictions.length > 0;
  const activeOptionId =
    listOpen && activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (listOpen) {
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      if (predictions.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i < 0 ? 0 : (i + 1) % predictions.length));
      return;
    }

    if (e.key === 'ArrowUp') {
      if (!listOpen) return;
      e.preventDefault();
      setActiveIndex((i) =>
        i <= 0 ? predictions.length - 1 : i - 1,
      );
      return;
    }

    if (e.key === 'Enter') {
      if (listOpen && activeIndex >= 0 && predictions[activeIndex]) {
        e.preventDefault();
        void selectPrediction(predictions[activeIndex]!);
      }
      // Otherwise let the form submit (Search Ride).
    }
  };

  return (
    <div className="places" ref={wrapRef}>
      {showLabel ? (
        <label className="option-caption" htmlFor={inputId}>
          Where?
        </label>
      ) : null}
      <input
        id={inputId}
        className="places-input"
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={listOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        aria-haspopup="listbox"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (predictions.length) {
            setOpen(true);
            if (activeIndex < 0) setActiveIndex(0);
          }
        }}
        onKeyDown={onKeyDown}
      />
      {loading ? <span className="places-hint">Searching…</span> : null}
      {listOpen ? (
        <ul id={listId} className="places-list" role="listbox">
          {predictions.map((row, index) => {
            const optionId = `${listId}-opt-${index}`;
            const selected = index === activeIndex;
            return (
              <li key={row.place_id} role="presentation">
                <button
                  type="button"
                  id={optionId}
                  role="option"
                  aria-selected={selected}
                  className={`places-option${selected ? ' is-active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void selectPrediction(row)}
                >
                  <span className="places-main">
                    {row.structured_formatting?.main_text || row.description}
                  </span>
                  {row.structured_formatting?.secondary_text ? (
                    <span className="places-secondary">
                      {row.structured_formatting.secondary_text}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
