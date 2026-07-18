import { useEffect, useId, useRef, useState } from 'react';
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
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const sessionRef = useRef(newSessionToken());
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
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
      return;
    }

    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const rows = await placesAutocomplete(q, sessionRef.current);
        setPredictions(rows);
        setOpen(true);
      } catch {
        setPredictions([]);
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
    try {
      const details = await placeDetails(row.place_id, sessionRef.current);
      onPlaceSelected(parsePlaceDetails(details, row.description));
    } catch {
      onPlaceSelected(parsePlaceDetails(null, row.description));
    }
    sessionRef.current = newSessionToken();
  };

  return (
    <div className="places" ref={wrapRef}>
      <span className="option-caption">Where?</span>
      <input
        id={`${listId}-input`}
        className="places-input"
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (predictions.length) setOpen(true);
        }}
      />
      {loading ? <span className="places-hint">Searching…</span> : null}
      {open && predictions.length > 0 ? (
        <ul id={listId} className="places-list" role="listbox">
          {predictions.map((row) => (
            <li key={row.place_id} role="option">
              <button
                type="button"
                className="places-option"
                onClick={() => selectPrediction(row)}
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
          ))}
        </ul>
      ) : null}
    </div>
  );
}
