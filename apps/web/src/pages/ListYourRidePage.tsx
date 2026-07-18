import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/http';
import {
  createHostListing,
  decodeVin,
  draftToListingBody,
  emptyListRideDraft,
  publishHostListing,
  uploadHostListingPhoto,
  type ListRideDraft,
} from '../api/hostListings';
import { CAR_FEATURE_LABELS } from '../api/listings';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import ProfileLayout from '../components/ProfileLayout';

const STEPS = 6;

const VEHICLE_TYPES = [
  'Car',
  'SUV',
  'Pickup Truck',
  'Van',
  'Minivan',
  'Mooped And Scooter',
] as const;

const ADVANCE_OPTIONS = [
  'Instant booking',
  '1 hour',
  '2 hours',
  '6 hours',
  '12 hours',
  '1 day',
  '2 days',
] as const;

const TRIP_OPTIONS = [
  '1 day',
  '2 days',
  '3 days',
  '5 days',
  '1 week',
  '2 weeks',
  '1 month',
] as const;

const FEATURE_KEYS = Object.keys(CAR_FEATURE_LABELS);

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="lyr-field">
      <span className="lyr-label">{label}</span>
      {children}
    </label>
  );
}

function ListYourRideWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ListRideDraft>(() => emptyListRideDraft());
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [vinBusy, setVinBusy] = useState(false);
  const [vinMessage, setVinMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAgree, setShowAgree] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [showPhotoExamples, setShowPhotoExamples] = useState(false);
  const [photoExampleIndex, setPhotoExampleIndex] = useState(0);

  const PHOTO_EXAMPLES = [
    { title: 'Angled front', src: '/list-ride/group-27-copy.png' },
    { title: "Driver's side", src: '/list-ride/group-25-copy.png' },
    { title: 'Rear', src: '/list-ride/group-22.png' },
    { title: 'Front seats', src: '/list-ride/group-30.png' },
    { title: 'Rear seats', src: '/list-ride/group-31.png' },
  ] as const;

  useEffect(() => {
    const urls = draft.photos.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [draft.photos]);

  const patch = (partial: Partial<ListRideDraft>) => {
    setDraft((d) => ({ ...d, ...partial }));
    setError(null);
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!draft.pickupAddress.trim() || !draft.city.trim()) {
        return 'Enter a pickup address and city.';
      }
      if (draft.vin.trim().length !== 17) {
        return 'Enter a valid 17-character VIN.';
      }
      if (!draft.make.trim() || !draft.model.trim() || !draft.year.trim()) {
        return 'Make, model, and year are required (decode VIN or enter manually).';
      }
      return null;
    }
    if (step === 2) {
      if (!draft.advanceNotice || !draft.shortestTrip || !draft.longestTrip) {
        return 'Choose availability options.';
      }
      if (!draft.dailyKm.trim()) return 'Enter daily kilometre allowance.';
      return null;
    }
    if (step === 3) {
      if (!draft.pricePerDay || Number(draft.pricePerDay) <= 0) {
        return 'Enter a daily price.';
      }
      return null;
    }
    if (step === 5) {
      if (draft.photos.length < 1) return 'Upload at least one photo.';
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

  const onDecodeVin = async () => {
    const vin = draft.vin.trim();
    if (vin.length !== 17) {
      setVinMessage('VIN must be 17 characters.');
      return;
    }
    setVinBusy(true);
    setVinMessage(null);
    try {
      const res = await decodeVin(vin);
      if (res.exists) {
        setVinMessage('This VIN is already listed on RentYourRide.');
        return;
      }
      if (!res.vehicleData) {
        setVinMessage(res.message || 'Could not decode VIN.');
        return;
      }
      const v = res.vehicleData;
      patch({
        vehicleData: v,
        make: String(v.make || draft.make),
        model: String(v.model || draft.model),
        year: String(v.year || draft.year),
        transmission: String(v.transmission || draft.transmission),
        fuelType: String(v.fuelType || draft.fuelType),
        vehicleType: String(v.body || v.style || draft.vehicleType),
      });
      setVinMessage('VIN decoded successfully.');
    } catch (err) {
      setVinMessage(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'VIN decode failed',
      );
    } finally {
      setVinBusy(false);
    }
  };

  const goNext = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step < STEPS) setStep(step + 1);
    else setShowAgree(true);
  };

  const goBack = () => {
    setError(null);
    if (step > 1) setStep(step - 1);
  };

  const onPublish = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body = draftToListingBody(draft);
      const created = await createHostListing(body);
      for (const file of draft.photos) {
        await uploadHostListingPhoto(created.id, file);
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

  return (
    <div className="lyr">
      <div className="lyr-top">
        <h1 className="lyr-title">List Your Ride</h1>
        <span className="lyr-step-label">
          Step {step} / {STEPS}
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
        <section className="lyr-section">
          <h2 className="lyr-section-title">Tell us about your ride</h2>
          <p className="lyr-help">Where is the vehicle usually parked?</p>
          <div className="lyr-grid">
            <Field label="Pickup address">
              <PlacesAutocomplete
                value={draft.pickupAddress}
                onChange={(text) => patch({ pickupAddress: text })}
                onPlaceSelected={(place) => {
                  patch({
                    pickupAddress: place.query,
                    city: place.city || draft.city,
                    country: place.country || draft.country,
                    latitude: place.latitude,
                    longitude: place.longitude,
                  });
                }}
                placeholder="Street address, city"
              />
            </Field>
            <Field label="City">
              <input
                className="lyr-input"
                value={draft.city}
                onChange={(e) => patch({ city: e.target.value })}
              />
            </Field>
            <Field label="VIN">
              <div className="lyr-vin-row">
                <input
                  className="lyr-input"
                  value={draft.vin}
                  maxLength={17}
                  onChange={(e) =>
                    patch({ vin: e.target.value.toUpperCase() })
                  }
                  placeholder="17-character VIN"
                />
                <button
                  type="button"
                  className="lyr-secondary-btn"
                  disabled={vinBusy}
                  onClick={() => void onDecodeVin()}
                >
                  {vinBusy ? 'Decoding…' : 'Decode'}
                </button>
              </div>
              {vinMessage ? <p className="lyr-vin-msg">{vinMessage}</p> : null}
            </Field>
            <Field label="Year">
              <input
                className="lyr-input"
                value={draft.year}
                onChange={(e) => patch({ year: e.target.value })}
              />
            </Field>
            <Field label="Make">
              <input
                className="lyr-input"
                value={draft.make}
                onChange={(e) => patch({ make: e.target.value })}
              />
            </Field>
            <Field label="Model">
              <input
                className="lyr-input"
                value={draft.model}
                onChange={(e) => patch({ model: e.target.value })}
              />
            </Field>
            <Field label="Vehicle type">
              <select
                className="lyr-input"
                value={draft.vehicleType}
                onChange={(e) => patch({ vehicleType: e.target.value })}
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Color">
              <input
                className="lyr-input"
                value={draft.color}
                onChange={(e) => patch({ color: e.target.value })}
              />
            </Field>
            <Field label="Transmission">
              <select
                className="lyr-input"
                value={draft.transmission}
                onChange={(e) => patch({ transmission: e.target.value })}
              >
                <option>Automatic</option>
                <option>Manual</option>
              </select>
            </Field>
            <Field label="Fuel type">
              <select
                className="lyr-input"
                value={draft.fuelType}
                onChange={(e) => patch({ fuelType: e.target.value })}
              >
                <option>Gasoline</option>
                <option>Diesel</option>
                <option>Hybrid</option>
                <option>Electricity</option>
                <option>Plug-in Hybrid</option>
              </select>
            </Field>
            <Field label="Odometer">
              <input
                className="lyr-input"
                value={draft.odometer}
                onChange={(e) => patch({ odometer: e.target.value })}
                placeholder="e.g. 45000 km"
              />
            </Field>
            <Field label="License plate">
              <input
                className="lyr-input"
                value={draft.licensePlate}
                onChange={(e) => patch({ licensePlate: e.target.value })}
              />
            </Field>
            <Field label="License province">
              <input
                className="lyr-input"
                value={draft.licenseProvince}
                onChange={(e) => patch({ licenseProvince: e.target.value })}
                placeholder="e.g. MB"
              />
            </Field>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="lyr-section">
          <h2 className="lyr-section-title">Trip settings</h2>
          <div className="lyr-grid">
            <Field label="Advance notice">
              <select
                className="lyr-input"
                value={draft.advanceNotice}
                onChange={(e) => patch({ advanceNotice: e.target.value })}
              >
                {ADVANCE_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Shortest trip">
              <select
                className="lyr-input"
                value={draft.shortestTrip}
                onChange={(e) => patch({ shortestTrip: e.target.value })}
              >
                {TRIP_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Longest trip">
              <select
                className="lyr-input"
                value={draft.longestTrip}
                onChange={(e) => patch({ longestTrip: e.target.value })}
              >
                {TRIP_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Daily kilometres included">
              <input
                className="lyr-input"
                value={draft.dailyKm}
                onChange={(e) => patch({ dailyKm: e.target.value })}
              />
            </Field>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="lyr-section">
          <h2 className="lyr-section-title">Pricing</h2>
          <div className="lyr-grid">
            <Field label="Daily price (CAD)">
              <input
                className="lyr-input"
                type="number"
                min={1}
                value={draft.pricePerDay}
                onChange={(e) => patch({ pricePerDay: e.target.value })}
              />
            </Field>
            <Field label="Weekly discount">
              <input
                className="lyr-input"
                value={draft.weeklyDiscount}
                onChange={(e) => patch({ weeklyDiscount: e.target.value })}
                placeholder="10%"
              />
            </Field>
            <Field label="Monthly discount">
              <input
                className="lyr-input"
                value={draft.monthlyDiscount}
                onChange={(e) => patch({ monthlyDiscount: e.target.value })}
                placeholder="20%"
              />
            </Field>
            <div className="lyr-toggle-row">
              <span className="lyr-label">Offer delivery</span>
              <label className="lyr-switch">
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
              <Field label="Delivery price (CAD)">
                <input
                  className="lyr-input"
                  type="number"
                  min={0}
                  value={draft.deliveryPrice}
                  onChange={(e) => patch({ deliveryPrice: e.target.value })}
                />
              </Field>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="lyr-section">
          <h2 className="lyr-section-title">Extras</h2>
          <div className="lyr-extras">
            {(
              [
                {
                  key: 'extrasUnlimitedKmOn' as const,
                  priceKey: 'extrasUnlimitedKmPrice' as const,
                  label: 'Unlimited kilometres',
                },
                {
                  key: 'extrasFuelOn' as const,
                  priceKey: 'extrasFuelPrice' as const,
                  label: 'Pre-paid fuel',
                },
                {
                  key: 'extrasCleaningOn' as const,
                  priceKey: 'extrasCleaningPrice' as const,
                  label: 'Pre-paid cleaning',
                },
              ] as const
            ).map((item) => (
              <div className="lyr-extra" key={item.key}>
                <div className="lyr-toggle-row">
                  <span className="lyr-label">{item.label}</span>
                  <label className="lyr-switch">
                    <input
                      type="checkbox"
                      checked={draft[item.key]}
                      onChange={(e) =>
                        patch({ [item.key]: e.target.checked })
                      }
                    />
                    <span className="lyr-switch-slider" />
                  </label>
                </div>
                {draft[item.key] ? (
                  <Field label="Price (CAD)">
                    <input
                      className="lyr-input"
                      type="number"
                      min={0}
                      value={draft[item.priceKey]}
                      onChange={(e) =>
                        patch({ [item.priceKey]: e.target.value })
                      }
                    />
                  </Field>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {step === 5 ? (
        <section className="lyr-section">
          <h2 className="lyr-section-title">Photos</h2>
          <p className="lyr-help">
            Upload clear photos of your vehicle. The first image is used as the
            cover photo.
          </p>
          <div className="lyr-photo-actions">
            <label className="lyr-upload">
              Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) {
                    patch({ photos: [...draft.photos, ...files].slice(0, 12) });
                  }
                  e.target.value = '';
                }}
              />
            </label>
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
          <div className="lyr-photo-grid">
            {photoPreviews.map((src, i) => (
              <div className="lyr-photo" key={`${src}-${i}`}>
                <img src={src} alt="" />
                <button
                  type="button"
                  className="lyr-photo-remove"
                  aria-label="Remove photo"
                  onClick={() =>
                    patch({
                      photos: draft.photos.filter((_, idx) => idx !== i),
                    })
                  }
                >
                  <img src="/close.png" alt="" className="close-x-img" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {step === 6 ? (
        <section className="lyr-section">
          <h2 className="lyr-section-title">Describe your ride</h2>
          <Field label="Description">
            <textarea
              className="lyr-textarea"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Tell guests what makes this ride special (min 32 characters)…"
              maxLength={4000}
            />
          </Field>
          <p className="lyr-help">
            {draft.description.trim().length}/32 characters minimum
          </p>
          <h3 className="lyr-subsection">Features</h3>
          <div className="lyr-features">
            {FEATURE_KEYS.map((key) => {
              const selected = draft.carFeatures.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`lyr-feature${selected ? ' is-selected' : ''}`}
                  onClick={() =>
                    patch({
                      carFeatures: selected
                        ? draft.carFeatures.filter((k) => k !== key)
                        : [...draft.carFeatures, key],
                    })
                  }
                >
                  {CAR_FEATURE_LABELS[key]}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {error ? <p className="profile-error">{error}</p> : null}

      <div className="lyr-footer">
        {step > 1 ? (
          <button type="button" className="lyr-back" onClick={goBack}>
            Back
          </button>
        ) : (
          <Link to="/profile/your-rides" className="lyr-back">
            Cancel
          </Link>
        )}
        <button
          type="button"
          className="lyr-next"
          onClick={goNext}
          disabled={submitting}
        >
          {step === STEPS ? 'Finish' : 'Next'}
        </button>
      </div>

      {showAgree ? (
        <div
          className="lyr-modal-backdrop"
          role="presentation"
          onClick={() => !submitting && setShowAgree(false)}
        >
          <div
            className="lyr-modal lyr-modal--wide"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="lyr-modal-title">Host standards</h2>
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
                keeping your vehicle well maintained for your guests safety
              </li>
              <li>
                clean and fill your vehicle before a trip starts so your guest
                can have an amazing experience
              </li>
              <li>
                continuously update your vehicles availability through your
                calendar
              </li>
            </ul>
            <button
              type="button"
              className="lyr-next"
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

      {showReady ? (
        <div
          className="lyr-modal-backdrop"
          role="presentation"
          onClick={() => !submitting && setShowReady(false)}
        >
          <div
            className="lyr-modal lyr-modal--wide"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="lyr-modal-title">Ready to start earning?</h2>
            <img
              src="/list-ride/award1.png"
              alt=""
              className="lyr-modal-image"
            />
            <p className="lyr-modal-copy">
              Congratulations! Your vehicle is ready to be listed on Rent Your
              Ride to start earning some extra cash!
            </p>
            <p className="lyr-modal-copy">
              By listing your ride, you agree to the{' '}
              <Link to="/terms-conditions" className="lyr-modal-link">
                Rent Your Ride terms of service
              </Link>
            </p>
            <button
              type="button"
              className="lyr-next"
              disabled={submitting}
              onClick={() => void onPublish()}
            >
              {submitting ? 'Publishing…' : 'List My Ride'}
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
            <button
              type="button"
              className="lyr-back"
              onClick={() => setShowPhotoExamples(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ListYourRidePage() {
  return (
    <ProfileLayout>
      {() => <ListYourRideWizard />}
    </ProfileLayout>
  );
}
