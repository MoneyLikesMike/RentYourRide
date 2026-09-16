import {
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/http';
import {
  createHostListing,
  decodeVin,
  draftToListingBody,
  emptyListRideDraft,
  getHostListing,
  listHostListings,
  listingToDraft,
  patchHostListing,
  publishHostListing,
  uploadHostListingPhoto,
  type ListRideDraft,
} from '../api/hostListings';
import {
  isPayoutAccountReady,
  payoutsAccountStatus,
} from '../api/payouts';
import { CAR_FEATURE_ICONS, CAR_FEATURE_LABELS } from '../api/listings';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import PinAccuracyModal, {
  type PinAddressData,
} from '../components/PinAccuracyModal';
import ListRideCalendarModal from '../components/ListRideCalendarModal';
import GetPaidGate from '../components/GetPaidGate';
import ProfileLayout from '../components/ProfileLayout';
import {
  forwardGeocode,
  resolveBrowserCurrentLocation,
  type ParsedPlace,
} from '../api/maps';
import {
  findVehicleColor,
  VEHICLE_COLOR_OPTIONS,
} from '../data/vehicleColors';
import {
  DEFAULT_FUEL_TYPE_OPTIONS,
  DEFAULT_STYLE_OPTIONS,
  DEFAULT_TRANSMISSION_OPTIONS,
  DEFAULT_TRIM_OPTIONS,
  isValidVin,
  mergeFieldOptions,
  normalizeVin,
} from '../utils/vin';
import type { ListRideCalendarData } from '../utils/listingAvailability';

const STEPS = 6;

/* App parity — AvailabilitySetupScreen.js */
const ADVANCE_NOTICE_OPTIONS = [
  'Instant booking',
  '3 hours',
  '6 hours',
  '12 hours',
  '1 day',
  '2 days',
  '3 days',
] as const;

const SHORTEST_TRIP_OPTIONS = [
  '1 day',
  '2 days',
  '3 days',
  '5 days',
  '1 week',
  '2 weeks',
  '1 month',
] as const;

const LONGEST_TRIP_OPTIONS = [
  '1 day',
  '2 days',
  '3 days',
  '5 days',
  '1 week',
  '2 weeks',
  '1 month',
  '2 months',
  '3 months',
  '6 months',
  '1 year',
] as const;

const DAILY_KM_OPTIONS = [
  '100 km',
  '200 km',
  '300 km',
  '500 km',
  'Unlimited',
] as const;

const DISCOUNT_OPTIONS = [
  '5%',
  '10%',
  '15%',
  '20%',
  '25%',
  '30%',
  '35%',
  '40%',
  '45%',
  '50%',
  '55%',
  '60%',
  '65%',
  '70%',
] as const;

/** $0.25/km through $1.00/km in $0.05 steps — PricingSetupScreen */
const KM_OVERAGE_OPTIONS = (() => {
  const opts: number[] = [];
  for (let cents = 25; cents <= 100; cents += 5) {
    opts.push(cents / 100);
  }
  return opts;
})();

const formatKmOverageLabel = (fee: number) =>
  `$${Number(fee).toFixed(2)}/km`;

const ADVANCE_NOTICE_TIP =
  "Set how far in advance you would like guests to book your vehicle. We will block trips that don't give you enough notice. Guests are more likely to book your ride if you have Instant Booking available.";

const SHORTEST_TRIP_TIP =
  'Set the minimum duration a guest can rent your vehicle. We find 1 day minimum trips will result in more booking requests for you.';

const LONGEST_TRIP_TIP =
  'Set the maximum duration a guest can rent your vehicle.';

const DAILY_KM_TIP =
  'Set how many kilometres guests can put on your vehicle a day. We find 200kms or more will result in more booking requests for you.';

const DAILY_PRICE_TIP =
  'Set your daily rental rate. Enter a whole number only (no decimals).';

const KM_OVERAGE_TIP =
  'Guests get a daily kilometre allowance with each trip. This is the price per kilometre they pay if they go over that allowance. You can choose any rate from $0.25/km up to $1.00/km.';

const DELIVERY_TIP =
  'Turn on delivery to allow guests to have the vehicle delivered to them. Delivery includes both drop off and pick up. You can set the delivery price when this is enabled.';

const WEEKLY_DISCOUNT_TIP =
  'Offer a discount for guests who rent for a week or longer. This can help attract longer bookings.';

const MONTHLY_DISCOUNT_TIP =
  'Offer a discount for guests who rent for a month or longer. Monthly rentals can provide more stable income.';

const PREPAID_FUEL_TIP =
  'Offer a pre-paid fuel option so guests can return the vehicle with a full tank without a separate refuel stop. Set the price you charge for this add-on.';

const PREPAID_CLEANING_TIP =
  'Offer a pre-paid cleaning option so the vehicle is returned detailed. Set the price you charge for this add-on.';

const UNLIMITED_KM_TIP =
  'Allow guests to drive without a daily kilometre limit for an extra fee. This can attract renters planning longer trips. Set the price for this add-on.';

/** Zeplin https://zpl.io/jplj90W / legacy FifthPage photo slots */
const PHOTO_SLOTS = [
  {
    key: 'cover',
    label: null as string | null,
    placeholder: '/list-ride/cover-placeholder.png',
    cover: true,
  },
  {
    key: 'angledFront',
    label: 'Angled front',
    placeholder: '/list-ride/group-27-copy.png',
    cover: false,
  },
  {
    key: 'driversSide',
    label: "Driver's side",
    placeholder: '/list-ride/group-25-copy.png',
    cover: false,
  },
  {
    key: 'rear',
    label: 'Rear',
    placeholder: '/list-ride/group-22.png',
    cover: false,
  },
  {
    key: 'frontSeats',
    label: 'Front seats',
    placeholder: '/list-ride/group-30.png',
    cover: false,
  },
  {
    key: 'rearSeats',
    label: 'Rear seats',
    placeholder: '/list-ride/group-31.png',
    cover: false,
  },
] as const;

const MAX_LISTING_PHOTOS = 10;

/** App DescribeYourRideScreen order */
const CAR_FEATURE_ORDER = [
  'navigation',
  'remoteStart',
  'backUpCamera',
  'audioInput',
  'usb',
  'bluetooth',
  'petFriendly',
  'convertible',
  'sunroof',
  'heatedSeats',
  'snowTires',
  'allWheelDrive',
] as const;

const DESCRIPTION_MAX_LENGTH = 500;
const INSTRUCTIONS_MAX_LENGTH = 500;

const DESCRIPTION_PLACEHOLDER =
  'Describe to guests why your ride is so special. Tell them why they should rent your ride';

const CHECK_IN_PLACEHOLDER =
  'Add instructions for guests when they pick up the vehicle (e.g. where to find the keys, parking spot, contact info)';

const CHECK_OUT_PLACEHOLDER =
  'Add instructions for guests when they drop off the vehicle (e.g. where to park, key return, fuel level)';

function LyrTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`lyr-tooltip${open ? ' is-open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="lyr-tooltip-btn"
        aria-label="More info"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ?
      </button>
      {open ? (
        <span className="lyr-tooltip-bubble" role="tooltip">
          {text}
          <span className="lyr-tooltip-caret" aria-hidden />
        </span>
      ) : null}
    </span>
  );
}

function ColorSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = findVehicleColor(value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="lyr-color-select" ref={wrapRef}>
      <button
        type="button"
        className={`lyr-input lyr-color-trigger${value ? '' : ' is-placeholder'}${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="fyc-color-value">
          {selected ? (
            <>
              <span
                className="fyc-color-swatch"
                style={{ background: selected.hex }}
              />
              {selected.name}
            </>
          ) : (
            'Color'
          )}
        </span>
      </button>
      {open ? (
        <div className="lyr-color-dropdown" role="listbox">
          {VEHICLE_COLOR_OPTIONS.map((c) => (
            <button
              key={c.name}
              type="button"
              role="option"
              aria-selected={selected?.name === c.name}
              className={`fyc-filter-option fyc-color-value${selected?.name === c.name ? ' selected' : ''}`}
              onClick={() => {
                onChange(c.name);
                setOpen(false);
              }}
            >
              <span
                className="fyc-color-swatch"
                style={{ background: c.hex }}
              />
              {c.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  tip,
  children,
}: {
  label: string;
  tip?: string;
  children: ReactNode;
}) {
  return (
    <div className="lyr-field">
      <div className="lyr-label-row">
        <span className="lyr-label">{label}</span>
        {tip ? <LyrTooltip text={tip} /> : null}
      </div>
      {children}
    </div>
  );
}

const VIN_TIP =
  'We will use your VIN to help gather information to list your vehicle including the year, make and model.';


function ListYourRideWizard({
  mode = 'create',
  listingId,
}: {
  mode?: 'create' | 'edit';
  listingId?: string;
}) {
  const navigate = useNavigate();
  const isEdit = mode === 'edit' && Boolean(listingId);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ListRideDraft>(() => emptyListRideDraft());
  const [photoPreviews, setPhotoPreviews] = useState<Array<string | null>>(
    [],
  );
  const [loadingListing, setLoadingListing] = useState(isEdit);
  const [vinBusy, setVinBusy] = useState(false);
  const [vinMessage, setVinMessage] = useState<string | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinData, setPinData] = useState<PinAddressData | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAgree, setShowAgree] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [showPhotoExamples, setShowPhotoExamples] = useState(false);
  const [photoExampleIndex, setPhotoExampleIndex] = useState(0);
  const [photoDragIndex, setPhotoDragIndex] = useState<number | null>(null);
  const [photoDropIndex, setPhotoDropIndex] = useState<number | null>(null);
  const [transmissionOptions, setTransmissionOptions] = useState(
    () => [...DEFAULT_TRANSMISSION_OPTIONS],
  );
  const [fuelOptions, setFuelOptions] = useState(
    () => [...DEFAULT_FUEL_TYPE_OPTIONS],
  );
  const [trimOptions, setTrimOptions] = useState(
    () => [...DEFAULT_TRIM_OPTIONS],
  );
  const [styleOptions, setStyleOptions] = useState(
    () => [...DEFAULT_STYLE_OPTIONS],
  );

  const PHOTO_EXAMPLES = [
    { title: 'Front', src: '/list-ride/examples/front.jpeg' },
    { title: 'Angled front', src: '/list-ride/examples/angled-front.jpeg' },
    { title: "Driver's side", src: '/list-ride/examples/drivers-side.jpeg' },
    { title: 'Rear', src: '/list-ride/examples/rear.jpeg' },
    { title: 'Front cabin', src: '/list-ride/examples/front-cabin.jpeg' },
    { title: 'Rear cabin', src: '/list-ride/examples/rear-cabin.jpeg' },
  ] as const;

  useEffect(() => {
    if (!isEdit || !listingId) return;
    let cancelled = false;
    (async () => {
      setLoadingListing(true);
      setError(null);
      try {
        const listing = await getHostListing(listingId);
        if (cancelled) return;
        const next = listingToDraft(listing);
        setDraft(next);
        if (next.transmission) {
          setTransmissionOptions((prev) =>
            mergeFieldOptions(prev, [next.transmission]),
          );
        }
        if (next.fuelType) {
          setFuelOptions((prev) => mergeFieldOptions(prev, [next.fuelType]));
        }
        if (next.trim) {
          setTrimOptions((prev) => mergeFieldOptions(prev, [next.trim]));
        }
        if (next.vehicleType) {
          setStyleOptions((prev) =>
            mergeFieldOptions(prev, [next.vehicleType]),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not load listing',
          );
        }
      } finally {
        if (!cancelled) setLoadingListing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, listingId]);

  useEffect(() => {
    const objectUrls: string[] = [];
    const urls = draft.photos.map((p) => {
      if (!p) return null;
      if (typeof p === 'string') return p;
      const url = URL.createObjectURL(p);
      objectUrls.push(url);
      return url;
    });
    setPhotoPreviews(urls);
    return () => {
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [draft.photos]);

  const patch = (partial: Partial<ListRideDraft>) => {
    setDraft((d) => ({ ...d, ...partial }));
    setError(null);
  };

  /**
   * Adds one or many files at once. The first file lands on the slot the host
   * picked; the rest fill the remaining empty slots, then append as extras.
   */
  const addPhotos = (files: File[], targetIndex?: number) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;

    const next = [...draft.photos];
    while (next.length < PHOTO_SLOTS.length) next.push(null);
    const queue = [...images];

    if (targetIndex != null && queue.length) {
      next[targetIndex] = queue.shift() ?? null;
    }
    for (const file of queue) {
      const hole = next.findIndex((f) => !f);
      if (hole >= 0) next[hole] = file;
      else if (next.length < MAX_LISTING_PHOTOS) next.push(file);
      else break;
    }
    patch({ photos: next.slice(0, MAX_LISTING_PHOTOS) });
  };

  const movePhoto = (from: number, to: number) => {
    if (from === to) return;
    const next = [...draft.photos];
    while (next.length < PHOTO_SLOTS.length) next.push(null);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved ?? null);
    patch({ photos: next });
  };

  /** Drag to reorder existing photos, or drop files straight from the desktop. */
  const photoDragProps = (index: number, baseClassName: string) => ({
    draggable: Boolean(draft.photos[index]),
    onDragStart: (e: ReactDragEvent) => {
      if (!draft.photos[index]) return;
      setPhotoDragIndex(index);
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e: ReactDragEvent) => {
      const droppingFiles = e.dataTransfer.types.includes('Files');
      if (photoDragIndex === null && !droppingFiles) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = droppingFiles ? 'copy' : 'move';
      setPhotoDropIndex(index);
    },
    onDragLeave: () => {
      setPhotoDropIndex((current) => (current === index ? null : current));
    },
    onDrop: (e: ReactDragEvent) => {
      const dropped = Array.from(e.dataTransfer.files || []);
      if (dropped.length) {
        e.preventDefault();
        addPhotos(dropped, index);
      } else if (photoDragIndex !== null) {
        e.preventDefault();
        movePhoto(photoDragIndex, index);
      }
      setPhotoDragIndex(null);
      setPhotoDropIndex(null);
    },
    onDragEnd: () => {
      setPhotoDragIndex(null);
      setPhotoDropIndex(null);
    },
    className: [
      baseClassName,
      photoDragIndex === index ? 'is-dragging' : '',
      photoDropIndex === index && photoDragIndex !== index ? 'is-drop-target' : '',
    ]
      .filter(Boolean)
      .join(' '),
  });

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!draft.pickupAddress.trim()) {
        return 'Enter a pickup address.';
      }
      if (!draft.city.trim() || !draft.country.trim()) {
        return 'Confirm your pickup location on the map.';
      }
      if (
        draft.latitude == null ||
        draft.longitude == null ||
        !Number.isFinite(draft.latitude) ||
        !Number.isFinite(draft.longitude)
      ) {
        return 'Confirm the pin location on the map.';
      }
      if (!isValidVin(draft.vin) || !draft.vehicleData) {
        return 'Enter a valid VIN to identify your vehicle.';
      }
      if (!draft.make.trim() || !draft.model.trim() || !draft.year.trim()) {
        return 'Make, model, and year are required (decode VIN or enter manually).';
      }
      if (!draft.odometer.trim()) {
        return 'Select an odometer range.';
      }
      if (!draft.transmission.trim()) {
        return 'Select a transmission type.';
      }
      if (!draft.color.trim()) {
        return 'Select a color.';
      }
      if (!draft.fuelType.trim()) {
        return 'Select a fuel type.';
      }
      if (!draft.licensePlate.trim() || !draft.licenseProvince.trim()) {
        return 'Enter license plate and province/state.';
      }
      if (!draft.neverHadSalvageTitle) {
        return 'Your vehicle must never have had a salvage title to list on RentYourRide.';
      }
      return null;
    }
    if (step === 2) {
      if (!draft.advanceNotice) return 'Select advance notice.';
      if (!draft.shortestTrip) return 'Select shortest possible trip.';
      if (!draft.longestTrip) return 'Select longest possible trip.';
      if (!draft.dailyKm.trim()) return 'Select daily kilometre restriction.';
      return null;
    }
    if (step === 3) {
      if (!draft.pricePerDay || Number(draft.pricePerDay) <= 0) {
        return 'Enter a daily price (whole number).';
      }
      if (draft.deliveryEnabled && !draft.deliveryPrice.trim()) {
        return 'Enter a delivery price.';
      }
      return null;
    }
    if (step === 5) {
      const count = draft.photos.filter(Boolean).length;
      if (count < 1) return 'Upload at least one photo (cover recommended).';
      return null;
    }
    if (step === 6) {
      if (draft.description.trim().length < 32) {
        return 'Description must be at least 32 characters.';
      }
      return null;
    }
    return null;
  };

  const openPinConfirm = async (pending: {
    address: string;
    city: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    region?: string;
  }) => {
    setLocBusy(true);
    setError(null);
    try {
      let lat = pending.latitude;
      let lng = pending.longitude;
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat == null ||
        lng == null
      ) {
        const query = [pending.address, pending.city, pending.country]
          .filter(Boolean)
          .join(', ');
        if (!query.trim()) {
          throw new Error('Please enter your pickup address before continuing.');
        }
        const geo = await forwardGeocode(query);
        lat = geo.latitude;
        lng = geo.longitude;
        pending = {
          address: pending.address || geo.street || geo.formatted,
          city: pending.city || geo.city,
          country: pending.country || geo.country,
          latitude: lat,
          longitude: lng,
          region: pending.region || geo.region,
        };
      }
      setPinData({
        address: pending.address,
        city: pending.city,
        country: pending.country,
        latitude: lat as number,
        longitude: lng as number,
        region: pending.region,
      });
      setPinOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not find that location on the map.',
      );
    } finally {
      setLocBusy(false);
    }
  };

  const applyPinConfirm = (data: PinAddressData) => {
    const pickupAddress = [data.address, data.city, data.country]
      .filter(Boolean)
      .join(', ');
    patch({
      pickupAddress,
      city: data.city,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
      ...(data.region ? { licenseProvince: data.region } : {}),
    });
    setPinOpen(false);
  };

  const onPlaceSelectedForPin = (place: ParsedPlace) => {
    void openPinConfirm({
      address: place.street || place.query.split(',')[0]?.trim() || place.query,
      city: place.city,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      region: place.region || place.regionCode,
    });
  };

  const locationReady =
    Boolean(draft.city.trim()) &&
    Boolean(draft.country.trim()) &&
    draft.latitude != null &&
    draft.longitude != null &&
    Number.isFinite(draft.latitude) &&
    Number.isFinite(draft.longitude);

  const vehicleReady = Boolean(draft.vehicleData);

  const vehicleSummary = [
    [draft.year, draft.make, draft.model].filter(Boolean).join(' '),
    [draft.trim, draft.vehicleType, draft.transmission, draft.fuelType]
      .filter(Boolean)
      .join(' · '),
  ]
    .filter(Boolean)
    .join(' · ');

  const onDecodeVin = async (vinOverride?: string) => {
    const vin = normalizeVin(vinOverride ?? draft.vin);
    if (!isValidVin(vin)) {
      setVinMessage(
        'VIN must be exactly 17 characters (letters and numbers, no I, O, or Q).',
      );
      return;
    }
    setVinBusy(true);
    setVinMessage(null);
    try {
      const res = await decodeVin(vin);
      if (res.exists) {
        setVinMessage('This VIN is already listed on RentYourRide.');
        patch({ vin, vehicleData: null });
        return;
      }
      const v = res.vehicleData;
      if (!v || (!v.make && !v.model)) {
        setVinMessage(
          res.message ||
            'We could not find vehicle details for this VIN. Check for typos or enter details manually.',
        );
        patch({ vin, vehicleData: null });
        return;
      }
      const opts =
        v.fieldOptions && typeof v.fieldOptions === 'object'
          ? (v.fieldOptions as Record<string, unknown>)
          : {};
      setTransmissionOptions(
        mergeFieldOptions(opts.transmission, DEFAULT_TRANSMISSION_OPTIONS),
      );
      setFuelOptions(
        mergeFieldOptions(opts.fuelType, DEFAULT_FUEL_TYPE_OPTIONS),
      );
      setTrimOptions(mergeFieldOptions(opts.trim, DEFAULT_TRIM_OPTIONS));
      setStyleOptions(mergeFieldOptions(opts.style, DEFAULT_STYLE_OPTIONS));

      patch({
        vehicleData: { ...v, vin },
        vin,
        make: String(v.make || ''),
        model: String(v.model || ''),
        year: String(v.year || ''),
        transmission: String(v.transmission || ''),
        fuelType: String(v.fuelType || ''),
        trim: String(v.trim || ''),
        vehicleType: String(v.style || v.body || ''),
      });
      setVinMessage(null);
    } catch (err) {
      setVinMessage(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'VIN lookup failed',
      );
    } finally {
      setVinBusy(false);
    }
  };

  const onVinChange = (raw: string) => {
    const vin = normalizeVin(raw).slice(0, 17);
    const decodedVin =
      draft.vehicleData && typeof draft.vehicleData.vin === 'string'
        ? normalizeVin(String(draft.vehicleData.vin))
        : '';

    if (draft.vehicleData && vin !== decodedVin) {
      setTransmissionOptions([...DEFAULT_TRANSMISSION_OPTIONS]);
      setFuelOptions([...DEFAULT_FUEL_TYPE_OPTIONS]);
      setTrimOptions([...DEFAULT_TRIM_OPTIONS]);
      setStyleOptions([...DEFAULT_STYLE_OPTIONS]);
      patch({
        vin,
        vehicleData: null,
        make: '',
        model: '',
        year: '',
        transmission: '',
        fuelType: '',
        trim: '',
        vehicleType: '',
        odometer: '',
      });
      setVinMessage(null);
    } else {
      patch({ vin });
    }

    if (isValidVin(vin) && vin !== decodedVin) {
      void onDecodeVin(vin);
    }
  };

  const onUseCurrentLocation = async () => {
    setLocBusy(true);
    setError(null);
    try {
      const place = await resolveBrowserCurrentLocation();
      setLocBusy(false);
      await openPinConfirm({
        address: place.street || place.formatted,
        city: place.city,
        country: place.country,
        latitude: place.latitude,
        longitude: place.longitude,
        region: place.region,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not get your current location.',
      );
      setLocBusy(false);
    }
  };

  const isUsLocation = /united states|usa|\bus\b/i.test(draft.country);
  const odometerOptions = isUsLocation
    ? [
        '0-50K miles',
        '50K-100K miles',
        '100K-150K miles',
        '150K-200K miles',
        '200K-250K miles',
        '250K-300K miles',
      ]
    : [
        '0-50K km',
        '50K-100K km',
        '100K-150K km',
        '150K-200K km',
        '200K-250K km',
        '250K-300K km',
      ];

  const goNext = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step < STEPS) setStep(step + 1);
    else if (isEdit) void onSave();
    else setShowAgree(true);
  };

  const goBack = () => {
    setError(null);
    if (step > 1) setStep(step - 1);
  };

  const onSave = async () => {
    if (!listingId) return;
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = draftToListingBody(draft);
      const photoRefs: Array<{ uri: string }> = [];
      for (const photo of draft.photos) {
        if (!photo) continue;
        if (typeof photo === 'string') {
          photoRefs.push({ uri: photo });
        } else {
          const uploaded = await uploadHostListingPhoto(listingId, photo);
          photoRefs.push({ uri: uploaded.uri });
        }
      }
      await patchHostListing(listingId, {
        ...body,
        photos: photoRefs,
      });
      navigate('/profile/your-rides', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save listing',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onPublish = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body = draftToListingBody(draft);
      const created = await createHostListing(body);
      for (const file of draft.photos) {
        if (file && typeof file !== 'string') {
          await uploadHostListingPhoto(created.id, file);
        }
      }
      await publishHostListing(created.id);
      navigate('/profile/your-rides', { replace: true });
    } catch (err) {
      setShowAgree(false);
      setShowReady(false);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not publish listing',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const primaryLabel = isEdit
    ? submitting
      ? 'Saving…'
      : 'Save'
    : step === STEPS
      ? 'Finish'
      : 'NEXT';

  if (loadingListing) {
    return (
      <div className="lyr">
        <div className="lyr-top">
          <h1 className="lyr-title">Edit ride</h1>
        </div>
        <p className="profile-muted">Loading your ride…</p>
      </div>
    );
  }

  return (
    <div className="lyr">
      <div className="lyr-top">
        <h1 className="lyr-title">{isEdit ? 'Edit ride' : 'List Your Ride'}</h1>
        <span className="lyr-step-label">
          {isEdit ? '' : 'Step '}
          {step} / {STEPS}
        </span>
      </div>

      <div className="lyr-progress" aria-hidden>
        {Array.from({ length: STEPS }, (_, i) => (
          <span
            key={i}
            className={`lyr-progress-bar${i < step ? ' is-done' : ''}`}
          />
        ))}
      </div>

      {step === 1 ? (
        <section className="lyr-section lyr-step1">
          <h2 className="lyr-section-title lyr-section-title--light">
            Where can guests pick up your ride?
          </h2>

          <div className="lyr-pair lyr-pair--address">
            <Field label="Address">
              <PlacesAutocomplete
                value={draft.pickupAddress}
                onChange={(text) =>
                  patch({
                    pickupAddress: text,
                    city: '',
                    country: '',
                    latitude: null,
                    longitude: null,
                  })
                }
                onPlaceSelected={onPlaceSelectedForPin}
                placeholder="Address"
                showLabel={false}
              />
            </Field>
            <div className="lyr-location-or">
              <span className="lyr-or">OR</span>
              <button
                type="button"
                className="lyr-location-btn"
                disabled={locBusy}
                onClick={() => void onUseCurrentLocation()}
              >
                <img
                  src="/list-ride/current-location-pin-mango.png"
                  alt=""
                  className="lyr-location-pin"
                  width={15}
                  height={22}
                />
                {locBusy ? 'Locating…' : 'Use current location'}
              </button>
            </div>
          </div>

          <hr className="lyr-divider" />

          <h2 className="lyr-section-title lyr-section-title--light lyr-section-title--spaced">
            What kind of vehicle do you have
          </h2>

          {!locationReady && !isEdit ? (
            <p className="lyr-vin-gate">
              Confirm your pickup location above to enter your VIN.
            </p>
          ) : (
            <div className="lyr-vin-block">
              <Field label="VIN" tip={isEdit ? undefined : VIN_TIP}>
                <input
                  className={`lyr-input${isEdit ? ' lyr-input--readonly' : ''}`}
                  value={draft.vin}
                  maxLength={17}
                  onChange={(e) => {
                    if (isEdit) return;
                    onVinChange(e.target.value);
                  }}
                  placeholder="Enter VIN"
                  disabled={vinBusy || isEdit}
                  readOnly={isEdit}
                  autoComplete="off"
                  spellCheck={false}
                />
                {!isEdit && vinBusy ? (
                  <p className="lyr-vin-msg">Looking up VIN…</p>
                ) : null}
                {!isEdit && !vinBusy && vinMessage ? (
                  <p className="lyr-vin-msg">{vinMessage}</p>
                ) : null}
              </Field>
              {vehicleReady && vehicleSummary ? (
                <p className="lyr-vehicle-summary">{vehicleSummary}</p>
              ) : null}
            </div>
          )}

          {(locationReady || isEdit) && vehicleReady ? (
            <>
              <hr className="lyr-divider" />

              <div className="lyr-pair">
                <Field label="ODOMETER">
                  <select
                    className={`lyr-input lyr-select${draft.odometer ? '' : ' is-placeholder'}`}
                    value={draft.odometer}
                    onChange={(e) => patch({ odometer: e.target.value })}
                  >
                    <option value="">
                      {isUsLocation ? '0-50k miles' : '0-50k km'}
                    </option>
                    {odometerOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="VEHICLE TRANSMISSION">
                  <select
                    className={`lyr-input lyr-select${draft.transmission ? '' : ' is-placeholder'}`}
                    value={draft.transmission}
                    onChange={(e) => patch({ transmission: e.target.value })}
                  >
                    <option value="">Transmission Type</option>
                    {transmissionOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {draft.odometer ? (
                <>
                  <div className="lyr-pair">
                    <Field label="trim (Optional)">
                      <select
                        className={`lyr-input lyr-select${draft.trim ? '' : ' is-placeholder'}`}
                        value={draft.trim}
                        onChange={(e) => patch({ trim: e.target.value })}
                      >
                        <option value="">Select trim</option>
                        {trimOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Style (Optional)">
                      <select
                        className={`lyr-input lyr-select${draft.vehicleType ? '' : ' is-placeholder'}`}
                        value={draft.vehicleType}
                        onChange={(e) => patch({ vehicleType: e.target.value })}
                      >
                        <option value="">Select style</option>
                        {draft.vehicleType &&
                        !styleOptions.includes(draft.vehicleType) ? (
                          <option value={draft.vehicleType}>
                            {draft.vehicleType}
                          </option>
                        ) : null}
                        {styleOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="lyr-pair">
                    <Field label="Color">
                      <ColorSelect
                        value={draft.color}
                        onChange={(color) => patch({ color })}
                      />
                    </Field>
                    <Field label="Fuel type">
                      <select
                        className={`lyr-input lyr-select${draft.fuelType ? '' : ' is-placeholder'}`}
                        value={draft.fuelType}
                        onChange={(e) => patch({ fuelType: e.target.value })}
                      >
                        <option value="">Select fuel type</option>
                        {fuelOptions.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <hr className="lyr-divider" />

                  <div className="lyr-pair">
                    <Field label="License plate">
                      <input
                        className="lyr-input"
                        value={draft.licensePlate}
                        onChange={(e) =>
                          patch({
                            licensePlate: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="ABC-1234"
                        maxLength={8}
                      />
                    </Field>
                    <Field label="Province/State of license plate">
                      <input
                        className="lyr-input"
                        value={draft.licenseProvince}
                        onChange={(e) =>
                          patch({ licenseProvince: e.target.value })
                        }
                        placeholder="Ontario"
                      />
                    </Field>
                  </div>

                  <p className="lyr-plate-note">
                    <span className="lyr-plate-note-icon" aria-hidden>
                      !
                    </span>
                    License plate info will not be visible to the public
                  </p>

                  <hr className="lyr-divider lyr-divider--accent" />

                  <div className="lyr-step1-bottom">
                    <div className="lyr-salvage">
                      <span>My car has never had a salvage title</span>
                      <label className="lyr-switch--lg">
                        <input
                          type="checkbox"
                          checked={draft.neverHadSalvageTitle}
                          onChange={(e) =>
                            patch({ neverHadSalvageTitle: e.target.checked })
                          }
                        />
                        <span className="lyr-switch-slider" aria-hidden />
                      </label>
                    </div>
                    {!isEdit ? (
                      <button
                        type="button"
                        className="lyr-next lyr-next--step1"
                        onClick={goNext}
                        disabled={submitting || vinBusy}
                      >
                        NEXT
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="lyr-section lyr-step2">
          <h2 className="lyr-section-title lyr-section-title--light">
            Availability and restrictions
          </h2>

          {/* App field order; Zeplin https://zpl.io/QMWm7DR two-column + helpers */}
          <div className="lyr-pair lyr-pair--avail">
            <Field label="Advance notice" tip={ADVANCE_NOTICE_TIP}>
              <select
                className={`lyr-input lyr-select${draft.advanceNotice ? '' : ' is-placeholder'}`}
                value={draft.advanceNotice}
                onChange={(e) => patch({ advanceNotice: e.target.value })}
              >
                <option value="">Select</option>
                {ADVANCE_NOTICE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <p className="lyr-avail-helper">
              We will block trips that don&apos;t give you enough notice
            </p>
          </div>

          <div className="lyr-pair lyr-pair--avail">
            <Field label="Shortest possible trip" tip={SHORTEST_TRIP_TIP}>
              <select
                className={`lyr-input lyr-select${draft.shortestTrip ? '' : ' is-placeholder'}`}
                value={draft.shortestTrip}
                onChange={(e) => patch({ shortestTrip: e.target.value })}
              >
                <option value="">Select</option>
                {SHORTEST_TRIP_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <p className="lyr-avail-helper">
              We will block requests that don&apos;t fit within your
              restrictions
            </p>
          </div>

          <div className="lyr-pair">
            <Field label="Longest possible trip" tip={LONGEST_TRIP_TIP}>
              <select
                className={`lyr-input lyr-select${draft.longestTrip ? '' : ' is-placeholder'}`}
                value={draft.longestTrip}
                onChange={(e) => patch({ longestTrip: e.target.value })}
              >
                <option value="">Select</option>
                {LONGEST_TRIP_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Daily kilometre restriction" tip={DAILY_KM_TIP}>
              <select
                className={`lyr-input lyr-select${draft.dailyKm ? '' : ' is-placeholder'}`}
                value={draft.dailyKm}
                onChange={(e) => patch({ dailyKm: e.target.value })}
              >
                <option value="">Select</option>
                {DAILY_KM_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <button
            type="button"
            className="lyr-calendar-row"
            onClick={() => setCalendarOpen(true)}
          >
            <span className="lyr-calendar-icon-wrap" aria-hidden>
              <img
                src="/list-ride/calendar-icon.png"
                alt=""
                className="lyr-calendar-icon"
                width={22}
                height={22}
              />
            </span>
            <span className="lyr-calendar-text">
              <span className="lyr-calendar-label">Calendar</span>
              <span className="lyr-calendar-desc">
                {draft.calendarData?.blockedRanges?.length
                  ? `${draft.calendarData.blockedRanges.length} blocked period${
                      draft.calendarData.blockedRanges.length === 1 ? '' : 's'
                    }`
                  : 'Block guests from booking specific dates on your calendar'}
              </span>
            </span>
            <span className="lyr-calendar-chevron" aria-hidden>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18l6-6-6-6"
                  stroke="#4cb6b1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="lyr-section lyr-step3">
          <h2 className="lyr-section-title lyr-section-title--light">
            Pricing
          </h2>

          {/* App order (PricingSetupScreen); Zeplin https://zpl.io/AOGjQyB styling */}
          <div className="lyr-pair lyr-pair--avail">
            <Field label="Daily price" tip={DAILY_PRICE_TIP}>
              <input
                className="lyr-input"
                inputMode="numeric"
                pattern="[0-9]*"
                value={draft.pricePerDay}
                onChange={(e) =>
                  patch({
                    pricePerDay: e.target.value.replace(/[^0-9]/g, ''),
                  })
                }
                placeholder="Price"
              />
            </Field>
            <p className="lyr-avail-helper">Type in no decimals allowed</p>
          </div>

          <div className="lyr-pair">
            <Field label="KM overage fee" tip={KM_OVERAGE_TIP}>
              <select
                className={`lyr-input lyr-select${draft.kmOverageFee ? '' : ' is-placeholder'}`}
                value={String(draft.kmOverageFee)}
                onChange={(e) =>
                  patch({ kmOverageFee: Number(e.target.value) })
                }
              >
                {KM_OVERAGE_OPTIONS.map((fee) => (
                  <option key={fee} value={fee}>
                    {formatKmOverageLabel(fee)}
                  </option>
                ))}
              </select>
            </Field>
            <span className="lyr-pair-spacer" aria-hidden />
          </div>

          <div className="lyr-delivery-block">
            <div className="lyr-delivery-head">
              <div className="lyr-label-row">
                <span className="lyr-label">Delivery</span>
                <LyrTooltip text={DELIVERY_TIP} />
              </div>
              <label className="lyr-switch--lg">
                <input
                  type="checkbox"
                  checked={draft.deliveryEnabled}
                  onChange={(e) =>
                    patch({ deliveryEnabled: e.target.checked })
                  }
                />
                <span className="lyr-switch-slider" />
              </label>
            </div>
            {draft.deliveryEnabled ? (
              <div className="lyr-delivery-price">
                <input
                  className="lyr-input"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={draft.deliveryPrice}
                  onChange={(e) =>
                    patch({
                      deliveryPrice: e.target.value.replace(/[^0-9]/g, ''),
                    })
                  }
                  placeholder="Delivery price"
                />
                <p className="lyr-field-hint">Type in no decimals allowed</p>
              </div>
            ) : null}
          </div>

          <hr className="lyr-divider" />

          <div className="lyr-pair">
            <Field label="Weekly discount" tip={WEEKLY_DISCOUNT_TIP}>
              <select
                className={`lyr-input lyr-select${draft.weeklyDiscount ? '' : ' is-placeholder'}`}
                value={draft.weeklyDiscount}
                onChange={(e) => patch({ weeklyDiscount: e.target.value })}
              >
                <option value="">Select</option>
                {DISCOUNT_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Monthly discount" tip={MONTHLY_DISCOUNT_TIP}>
              <select
                className={`lyr-input lyr-select${draft.monthlyDiscount ? '' : ' is-placeholder'}`}
                value={draft.monthlyDiscount}
                onChange={(e) => patch({ monthlyDiscount: e.target.value })}
              >
                <option value="">Select</option>
                {DISCOUNT_OPTIONS.map((o) => (
                  <option key={`m-${o}`} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="lyr-section lyr-step4">
          <h2 className="lyr-section-title lyr-section-title--light">
            Extras
          </h2>

          {/* App order (ExtrasSetupScreen); Zeplin https://zpl.io/Gnz7dlW two-column */}
          <div className="lyr-pair lyr-pair--extras">
            <div className="lyr-extra-card">
              <div className="lyr-extra-head">
                <div className="lyr-label-row">
                  <span className="lyr-label">Pre paid fuel</span>
                  <LyrTooltip text={PREPAID_FUEL_TIP} />
                </div>
                <label className="lyr-switch--lg">
                  <input
                    type="checkbox"
                    checked={draft.extrasFuelOn}
                    onChange={(e) =>
                      patch({ extrasFuelOn: e.target.checked })
                    }
                  />
                  <span className="lyr-switch-slider" />
                </label>
              </div>
              {draft.extrasFuelOn ? (
                <input
                  className="lyr-input"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={draft.extrasFuelPrice}
                  onChange={(e) =>
                    patch({
                      extrasFuelPrice: e.target.value.replace(/[^0-9]/g, ''),
                    })
                  }
                  placeholder="Price"
                />
              ) : null}
            </div>

            <div className="lyr-extra-card">
              <div className="lyr-extra-head">
                <div className="lyr-label-row">
                  <span className="lyr-label">Pre paid cleaning</span>
                  <LyrTooltip text={PREPAID_CLEANING_TIP} />
                </div>
                <label className="lyr-switch--lg">
                  <input
                    type="checkbox"
                    checked={draft.extrasCleaningOn}
                    onChange={(e) =>
                      patch({ extrasCleaningOn: e.target.checked })
                    }
                  />
                  <span className="lyr-switch-slider" />
                </label>
              </div>
              {draft.extrasCleaningOn ? (
                <input
                  className="lyr-input"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={draft.extrasCleaningPrice}
                  onChange={(e) =>
                    patch({
                      extrasCleaningPrice: e.target.value.replace(
                        /[^0-9]/g,
                        '',
                      ),
                    })
                  }
                  placeholder="Price"
                />
              ) : null}
            </div>
          </div>

          <div className="lyr-extra-card lyr-extra-card--solo">
            <div className="lyr-extra-head">
              <div className="lyr-label-row">
                <span className="lyr-label">Unlimited kilometres</span>
                <LyrTooltip text={UNLIMITED_KM_TIP} />
              </div>
              <label className="lyr-switch--lg">
                <input
                  type="checkbox"
                  checked={draft.extrasUnlimitedKmOn}
                  onChange={(e) =>
                    patch({ extrasUnlimitedKmOn: e.target.checked })
                  }
                />
                <span className="lyr-switch-slider" />
              </label>
            </div>
            {draft.extrasUnlimitedKmOn ? (
              <input
                className="lyr-input"
                inputMode="numeric"
                pattern="[0-9]*"
                value={draft.extrasUnlimitedKmPrice}
                onChange={(e) =>
                  patch({
                    extrasUnlimitedKmPrice: e.target.value.replace(
                      /[^0-9]/g,
                      '',
                    ),
                  })
                }
                placeholder="Price"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 5 ? (
        <section className="lyr-section lyr-step5">
          <div className="lyr-photos-title-row">
            <h2 className="lyr-section-title lyr-section-title--light">
              Photos
            </h2>
            <button
              type="button"
              className="lyr-see-examples"
              onClick={() => {
                setPhotoExampleIndex(0);
                setShowPhotoExamples(true);
              }}
            >
              See examples
            </button>
          </div>

          <p className="lyr-photo-hint">
            Choose several photos at once, then drag any photo to reorder. The
            first photo is your cover.
          </p>

          {/* Cover — Zeplin https://zpl.io/jplj90W */}
          <label
            {...photoDragProps(0, 'lyr-photo-slot lyr-photo-slot--cover')}
          >
            <span className="lyr-photo-cover-badge">
              This is your cover photo
            </span>
            {photoPreviews[0] ? (
              <img
                src={photoPreviews[0]}
                alt="Cover"
                className="lyr-photo-slot-img"
              />
            ) : (
              <span className="lyr-photo-slot-empty">
                <img
                  src={PHOTO_SLOTS[0].placeholder}
                  alt=""
                  className="lyr-photo-placeholder"
                />
                <span className="lyr-photo-upload-label">
                  <img
                    src="/list-ride/upload.png"
                    alt=""
                    width={16}
                    height={16}
                  />
                  Upload photo
                </span>
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addPhotos(Array.from(e.target.files || []), 0);
                e.target.value = '';
              }}
            />
            {draft.photos[0] ? (
              <button
                type="button"
                className="lyr-photo-slot-remove"
                aria-label="Remove cover photo"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const next = [...draft.photos];
                  next[0] = null;
                  patch({ photos: next });
                }}
              >
                <img src="/close.png" alt="" className="close-x-img" />
              </button>
            ) : null}
          </label>

          <div className="lyr-photo-slots">
            {PHOTO_SLOTS.slice(1).map((slot, i) => {
              const index = i + 1;
              const preview = photoPreviews[index];
              const filled = Boolean(draft.photos[index]);
              return (
                <div className="lyr-photo-slot-wrap" key={slot.key}>
                  <span className="lyr-photo-slot-label">{slot.label}</span>
                  <label {...photoDragProps(index, 'lyr-photo-slot')}>
                    {preview ? (
                      <img
                        src={preview}
                        alt={slot.label ?? ''}
                        className="lyr-photo-slot-img"
                      />
                    ) : (
                      <span className="lyr-photo-slot-empty">
                        <img
                          src={slot.placeholder}
                          alt=""
                          className="lyr-photo-placeholder"
                        />
                        <span className="lyr-photo-upload-label">
                          <img
                            src="/list-ride/upload.png"
                            alt=""
                            width={16}
                            height={16}
                          />
                          Upload photo
                        </span>
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e) => {
                        addPhotos(Array.from(e.target.files || []), index);
                        e.target.value = '';
                      }}
                    />
                    {filled ? (
                      <button
                        type="button"
                        className="lyr-photo-slot-remove"
                        aria-label={`Remove ${slot.label}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const next = [...draft.photos];
                          next[index] = null;
                          patch({ photos: next });
                        }}
                      >
                        <img src="/close.png" alt="" className="close-x-img" />
                      </button>
                    ) : null}
                  </label>
                </div>
              );
            })}

            {/* Extra filled photos beyond the labeled slots */}
            {draft.photos.slice(PHOTO_SLOTS.length).map((file, i) => {
              if (!file) return null;
              const index = PHOTO_SLOTS.length + i;
              const preview = photoPreviews[index];
              return (
                <div className="lyr-photo-slot-wrap" key={`extra-${index}`}>
                  <span className="lyr-photo-slot-label">&nbsp;</span>
                  <label {...photoDragProps(index, 'lyr-photo-slot')}>
                    {preview ? (
                      <img
                        src={preview}
                        alt=""
                        className="lyr-photo-slot-img"
                      />
                    ) : null}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e) => {
                        addPhotos(Array.from(e.target.files || []), index);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      className="lyr-photo-slot-remove"
                      aria-label="Remove photo"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const next = [...draft.photos];
                        next[index] = null;
                        patch({ photos: next });
                      }}
                    >
                      <img src="/close.png" alt="" className="close-x-img" />
                    </button>
                  </label>
                </div>
              );
            })}

            {/* Legacy / Zeplin “Add more photo” card */}
            {draft.photos.filter(Boolean).length < MAX_LISTING_PHOTOS ? (
              <div className="lyr-photo-slot-wrap">
                <span className="lyr-photo-slot-label">&nbsp;</span>
                <label className="lyr-photo-slot lyr-photo-slot--add">
                  <span className="lyr-photo-add-more">
                    <span className="lyr-photo-add-plus" aria-hidden>
                      +
                    </span>
                    <span className="lyr-photo-add-caption">Add more photos</span>
                    <span className="lyr-photo-add-max">
                      Select several at once — up to 10 photos
                    </span>
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                      addPhotos(Array.from(e.target.files || []));
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 6 ? (
        <section className="lyr-section lyr-step6">
          <h2 className="lyr-section-title lyr-section-title--light">
            Describe your ride
          </h2>

          <Field label="Vehicle description">
            <textarea
              className="lyr-textarea"
              value={draft.description}
              onChange={(e) => {
                const text = e.target.value.slice(0, DESCRIPTION_MAX_LENGTH);
                patch({ description: text });
              }}
              placeholder={DESCRIPTION_PLACEHOLDER}
              maxLength={DESCRIPTION_MAX_LENGTH}
              rows={5}
            />
          </Field>
          <p className="lyr-char-count">
            {draft.description.length}/{DESCRIPTION_MAX_LENGTH}
            {draft.description.trim().length < 32
              ? ' · minimum 32 characters'
              : ''}
          </p>

          <h3 className="lyr-features-heading">Car features</h3>
          <div className="lyr-feature-grid">
            {CAR_FEATURE_ORDER.map((key) => {
              const selected = draft.carFeatures.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`lyr-feature-card${selected ? ' is-selected' : ''}`}
                  onClick={() =>
                    patch({
                      carFeatures: selected
                        ? draft.carFeatures.filter((k) => k !== key)
                        : [...draft.carFeatures, key],
                    })
                  }
                >
                  <img
                    src={CAR_FEATURE_ICONS[key]}
                    alt=""
                    className="lyr-feature-icon"
                  />
                  <span className="lyr-feature-card-label">
                    {CAR_FEATURE_LABELS[key]}
                  </span>
                </button>
              );
            })}
          </div>

          <hr className="lyr-divider lyr-divider--accent" />

          {/* App-only fields (DescribeYourRideScreen) */}
          <Field label="Check-in instructions">
            <textarea
              className="lyr-textarea"
              value={draft.checkInInstructions}
              onChange={(e) => {
                const text = e.target.value.slice(0, INSTRUCTIONS_MAX_LENGTH);
                patch({ checkInInstructions: text });
              }}
              placeholder={CHECK_IN_PLACEHOLDER}
              maxLength={INSTRUCTIONS_MAX_LENGTH}
              rows={4}
            />
          </Field>
          <p className="lyr-char-count">
            {draft.checkInInstructions.length}/{INSTRUCTIONS_MAX_LENGTH}
          </p>

          <Field label="Check-out instructions">
            <textarea
              className="lyr-textarea"
              value={draft.checkOutInstructions}
              onChange={(e) => {
                const text = e.target.value.slice(0, INSTRUCTIONS_MAX_LENGTH);
                patch({ checkOutInstructions: text });
              }}
              placeholder={CHECK_OUT_PLACEHOLDER}
              maxLength={INSTRUCTIONS_MAX_LENGTH}
              rows={4}
            />
          </Field>
          <p className="lyr-char-count">
            {draft.checkOutInstructions.length}/{INSTRUCTIONS_MAX_LENGTH}
          </p>
        </section>
      ) : null}

      {error ? <p className="profile-error">{error}</p> : null}

      {isEdit ? (
        <div className="lyr-footer lyr-footer--edit">
          <button
            type="button"
            className="lyr-next lyr-next--edit-save"
            onClick={() => void onSave()}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
          <div className="lyr-footer-stepper" aria-label={`Step ${step} of ${STEPS}`}>
            <button
              type="button"
              className="lyr-stepper-arrow"
              aria-label="Previous step"
              disabled={step <= 1 || submitting}
              onClick={goBack}
            >
              <svg width="13" height="6" viewBox="0 0 13 6" fill="none" aria-hidden>
                <path
                  d="M12 3H1M1 3l3.5-2.5M1 3L4.5 5.5"
                  stroke="#4cb6b1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="lyr-stepper-arrow"
              aria-label="Next step"
              disabled={step >= STEPS || submitting}
              onClick={() => {
                const err = validateStep();
                if (err) {
                  setError(err);
                  return;
                }
                setError(null);
                setStep(step + 1);
              }}
            >
              <svg width="13" height="6" viewBox="0 0 13 6" fill="none" aria-hidden>
                <path
                  d="M1 3h11M12 3L8.5 0.5M12 3L8.5 5.5"
                  stroke="#4cb6b1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span className="lyr-footer-step-count">
              {step} / {STEPS}
            </span>
          </div>
        </div>
      ) : step > 1 ? (
        <div className="lyr-footer">
          <div className="lyr-footer-actions">
            <button type="button" className="lyr-back" onClick={goBack}>
              <svg
                className="lyr-back-chevron"
                width="5"
                height="10"
                viewBox="0 0 5 10"
                fill="none"
                aria-hidden
              >
                <path
                  d="M4 1L1 5l3 4"
                  stroke="#3aafa9"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </button>
            <button
              type="button"
              className="lyr-next"
              onClick={goNext}
              disabled={submitting}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      ) : null}

      <PinAccuracyModal
        open={pinOpen}
        addressData={pinData}
        onClose={() => setPinOpen(false)}
        onConfirm={applyPinConfirm}
        onAddressUpdate={(partial) => {
          setPinData((prev) => (prev ? { ...prev, ...partial } : prev));
        }}
      />

      <ListRideCalendarModal
        open={calendarOpen}
        initial={draft.calendarData}
        onClose={() => setCalendarOpen(false)}
        onSave={(data: ListRideCalendarData) => {
          patch({ calendarData: data });
          setCalendarOpen(false);
        }}
      />

      {showAgree && !isEdit ? (
        <div
          className="lyr-modal-backdrop lyr-modal-backdrop--finish"
          role="presentation"
          onClick={() => !submitting && setShowAgree(false)}
        >
          <div
            className="lyr-modal lyr-modal--finish lyr-modal--host-standards"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lyr-host-standards-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="lyr-modal-close lyr-modal-close--finish"
              onClick={() => !submitting && setShowAgree(false)}
              aria-label="Close"
            >
              <img src="/close.png" alt="" className="close-x-img" />
            </button>
            <h2 id="lyr-host-standards-title" className="lyr-modal-title">
              Host standards
            </h2>
            <img
              src="/list-ride/award.png"
              alt=""
              className="lyr-modal-image"
            />
            <p className="lyr-modal-copy">
              Rent Your Ride wants to create the best experience for both hosts
              and travellers. As a host you have the responsibility of
              maintaining that experience by:
            </p>
            <ul className="lyr-modal-list">
              <li>
                - keeping your vehicle well maintained for your guests safety
              </li>
              <li>
                - clean and fill your vehicle before a trip starts so your guest
                can have an amazing experience
              </li>
              <li>
                - continuously update your vehicles availability through your
                calendar
              </li>
            </ul>
            <button
              type="button"
              className="lyr-next lyr-next--finish-modal"
              onClick={() => {
                setShowAgree(false);
                setShowReady(true);
              }}
            >
              I agree
            </button>
          </div>
        </div>
      ) : null}

      {showReady && !isEdit ? (
        <div
          className="lyr-modal-backdrop lyr-modal-backdrop--finish"
          role="presentation"
          onClick={() => !submitting && setShowReady(false)}
        >
          <div
            className="lyr-modal lyr-modal--finish lyr-modal--ready"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lyr-ready-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="lyr-modal-close lyr-modal-close--finish"
              onClick={() => !submitting && setShowReady(false)}
              aria-label="Close"
              disabled={submitting}
            >
              <img src="/close.png" alt="" className="close-x-img" />
            </button>
            <h2 id="lyr-ready-title" className="lyr-modal-title">
              Ready to start earning?
            </h2>
            <img
              src="/list-ride/award1.png"
              alt=""
              className="lyr-modal-image"
            />
            <p className="lyr-modal-copy">
              Congratulations! Your vehicle is ready to be listed on Rent Your
              Ride to start earning some extra cash!
            </p>
            <p className="lyr-modal-copy lyr-modal-copy--terms">
              By listing your ride, you agree to the{' '}
              <Link
                to="/terms-conditions"
                className="lyr-modal-link"
                target="_blank"
              >
                Rent Your Ride terms of service
              </Link>
            </p>
            <button
              type="button"
              className="lyr-next lyr-next--finish-modal"
              disabled={submitting}
              onClick={() => void onPublish()}
            >
              {submitting ? 'Publishing…' : 'List my ride'}
            </button>
          </div>
        </div>
      ) : null}

      {showPhotoExamples ? (
        <div
          className="lyr-modal-backdrop"
          role="presentation"
          onClick={() => setShowPhotoExamples(false)}
        >
          <div
            className="lyr-modal lyr-modal--photo"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="lyr-modal-close"
              onClick={() => setShowPhotoExamples(false)}
              aria-label="Close"
            >
              <img src="/close.png" alt="" className="close-x-img" />
            </button>
            <img
              src={PHOTO_EXAMPLES[photoExampleIndex].src}
              alt={PHOTO_EXAMPLES[photoExampleIndex].title}
              className="lyr-example-img"
            />
            <div className="lyr-example-nav">
              <span>{PHOTO_EXAMPLES[photoExampleIndex].title}</span>
              <div>
                <button
                  type="button"
                  disabled={photoExampleIndex === 0}
                  onClick={() => setPhotoExampleIndex((i) => i - 1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  disabled={photoExampleIndex === PHOTO_EXAMPLES.length - 1}
                  onClick={() => setPhotoExampleIndex((i) => i + 1)}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ListYourRidePage() {
  const { listingId } = useParams<{ listingId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEdit = Boolean(listingId);
  const [gate, setGate] = useState<'loading' | 'need-payout' | 'ok'>(
    isEdit ? 'ok' : 'loading',
  );
  const [gateError, setGateError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) {
      setGate('ok');
      return;
    }

    let cancelled = false;
    (async () => {
      setGate('loading');
      setGateError(null);
      try {
        const payoutParam = searchParams.get('payout');
        if (payoutParam === 'return' || payoutParam === 'refresh') {
          try {
            sessionStorage.setItem('ryr_payout_setup_complete', '1');
          } catch {
            /* ignore */
          }
          // Clear query so refresh doesn't keep re-flagging.
          setSearchParams({}, { replace: true });
        }

        const [listings, status] = await Promise.all([
          listHostListings().catch(() => []),
          payoutsAccountStatus().catch(() => null),
        ]);
        if (cancelled) return;

        let localComplete = false;
        try {
          localComplete = sessionStorage.getItem('ryr_payout_setup_complete') === '1';
        } catch {
          localComplete = false;
        }

        // App: canUseListingsHub = hasOwnedListing || payoutSetupComplete
        const allowed =
          listings.length > 0 ||
          isPayoutAccountReady(status) ||
          localComplete;
        setGate(allowed ? 'ok' : 'need-payout');
      } catch (err) {
        if (cancelled) return;
        setGateError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not check payout status',
        );
        setGate('need-payout');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, searchParams, setSearchParams]);

  return (
    <ProfileLayout title={isEdit ? 'Edit ride' : 'List your ride'}>
      {(me) => {
        if (isEdit) {
          return (
            <ListYourRideWizard mode="edit" listingId={listingId} />
          );
        }

        const identityOk =
          !!me.emailVerified && !!me.phoneVerified && !!me.licenseVerified;
        if (!identityOk) {
          return (
            <div className="get-paid-verify">
              <h2>Verify your account to list</h2>
              <p>
                Complete email, phone, and license verification before you can
                list a ride.
              </p>
              <Link
                className="get-paid-verify-link"
                to="/profile/contact-information"
              >
                Verify now
              </Link>
            </div>
          );
        }

        if (gate === 'loading') {
          return <p className="profile-status">Checking payout setup…</p>;
        }
        if (gate === 'need-payout') {
          return (
            <div className="get-paid-gate-wrap">
              {gateError ? (
                <p className="get-paid-gate-error">{gateError}</p>
              ) : null}
              <GetPaidGate
                returnPath="/profile/list-your-ride"
                onComplete={() => setGate('ok')}
              />
            </div>
          );
        }
        return <ListYourRideWizard mode="create" />;
      }}
    </ProfileLayout>
  );
}
