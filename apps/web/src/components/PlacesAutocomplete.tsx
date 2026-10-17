import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  parsePlaceDetails,
  placeDetails,
  placesAutocomplete,
  type ParsedPlace,
  type PlacePrediction,
} from '../api/maps';
import type { PlacesAutocompleteBias } from '../api/placesAutocompleteParams';

type Props = {
  value: string;
  onChange: (text: string) => void;
  onPlaceSelected: (place: ParsedPlace) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Set false to hide the built-in "Where?" label. */
  showLabel?: boolean;
  /** Soft ranking bias (current / last-searched location). Never restricts. */
  bias?: PlacesAutocompleteBias | null;
  /** Close the suggestion list (e.g. parent form submitted a search). */
  listClosedToken?: number;
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
  bias = null,
  listClosedToken = 0,
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
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const blurCloseTimerRef = useRef<number | null>(null);

  const closeList = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  useEffect(() => {
    closeList();
  }, [listClosedToken]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        closeList();
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    abortRef.current = null;

    const q = value.trim();
    if (q.length < 2) {
      setPredictions([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    const requestId = ++requestIdRef.current;
    debounceRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const rows = await placesAutocomplete(q, {
          sessionToken: sessionRef.current,
          bias,
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        setPredictions(rows);
        setOpen(rows.length > 0);
        // Leave highlight unset until ArrowDown / hover so first ↓ picks the top result.
        setActiveIndex(-1);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (requestId !== requestIdRef.current) return;
        setPredictions([]);
        setActiveIndex(-1);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 280);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [value, bias?.latitude, bias?.longitude, bias?.radiusMeters]);

  const selectPrediction = async (row: PlacePrediction) => {
    onChange(row.description);
    closeList();
    setPredictions([]);
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
        closeList();
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
        return;
      }
      // Form submit (Search Ride) — close suggestions so results stay visible.
      closeList();
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
          if (blurCloseTimerRef.current) {
            window.clearTimeout(blurCloseTimerRef.current);
            blurCloseTimerRef.current = null;
          }
          if (predictions.length) {
            setOpen(true);
          }
        }}
        onBlur={() => {
          // Delay so option mousedown/click can run first.
          blurCloseTimerRef.current = window.setTimeout(() => {
            closeList();
            blurCloseTimerRef.current = null;
          }, 120);
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
                  onMouseDown={(e) => {
                    // Keep focus long enough for click; avoid blur-before-select.
                    e.preventDefault();
                  }}
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
