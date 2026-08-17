import { useEffect, useRef, useState } from 'react';
import { reverseGeocode } from '../api/maps';
import { gestureHandling, useGoogleMapsApi } from './googleMaps';
import '../styles/pin-accuracy-modal.css';

export type PinAddressData = {
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  region?: string;
};

type Props = {
  open: boolean;
  addressData: PinAddressData | null;
  onClose: () => void;
  onConfirm: (data: PinAddressData) => void;
  onAddressUpdate?: (partial: Partial<PinAddressData>) => void;
};

export default function PinAccuracyModal({
  open,
  addressData,
  onClose,
  onConfirm,
  onAddressUpdate,
}: Props) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const { api } = useGoogleMapsApi();

  // Keeps the drag handler reading current props without re-creating the map.
  const addressRef = useRef(addressData);
  addressRef.current = addressData;
  const onAddressUpdateRef = useRef(onAddressUpdate);
  onAddressUpdateRef.current = onAddressUpdate;

  useEffect(() => {
    if (!open || !addressData) {
      setPin(null);
      return;
    }
    setPin({ lat: addressData.latitude, lng: addressData.longitude });
  }, [open, addressData?.latitude, addressData?.longitude]);

  useEffect(() => {
    if (!open || !api || !pin || !mapElRef.current) return;
    const center = { lat: pin.lat, lng: pin.lng };

    if (!mapRef.current) {
      mapRef.current = new api.maps.Map(mapElRef.current, {
        center,
        zoom: 17,
        mapId: import.meta.env.VITE_GOOGLE_MAPS_ID || undefined,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: gestureHandling(),
      });

      const marker = new api.marker.Marker({
        map: mapRef.current,
        position: center,
        draggable: true,
        title: 'Drag to set the exact pickup spot',
      });

      marker.addListener('dragend', () => {
        const position = marker.getPosition();
        if (!position) return;
        const lat = position.lat();
        const lng = position.lng();
        setPin({ lat, lng });
        mapRef.current?.panTo({ lat, lng });

        void (async () => {
          setBusy(true);
          try {
            const geo = await reverseGeocode(lat, lng);
            onAddressUpdateRef.current?.({
              country: geo.country || addressRef.current?.country || '',
              city: geo.city || addressRef.current?.city || '',
              address:
                geo.street ||
                geo.formatted ||
                addressRef.current?.address ||
                '',
              latitude: lat,
              longitude: lng,
            });
          } catch {
            onAddressUpdateRef.current?.({ latitude: lat, longitude: lng });
          } finally {
            setBusy(false);
          }
        })();
      });

      markerRef.current = marker;
      return;
    }

    mapRef.current.setCenter(center);
    markerRef.current?.setPosition(center);
  }, [open, api, pin?.lat, pin?.lng]);

  useEffect(() => {
    if (open) return;
    markerRef.current?.setMap(null);
    markerRef.current = null;
    mapRef.current = null;
  }, [open]);

  if (!open || !addressData) return null;

  return (
    <div
      className="pin-accuracy-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="pin-accuracy-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-accuracy-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pin-accuracy-handle" aria-hidden />
        <h2 id="pin-accuracy-title" className="pin-accuracy-title">
          Is the pin in the right place?
        </h2>
        <p className="pin-accuracy-hint">
          Drag the pin to fine-tune the pickup spot. Guests only see the exact
          location after you approve their booking.
        </p>
        <div className="pin-accuracy-map-wrap">
          <div ref={mapElRef} className="pin-accuracy-map" />
          {busy ? (
            <span className="pin-accuracy-busy">Updating address…</span>
          ) : null}
        </div>
        <p className="pin-accuracy-address">
          {[addressData.address, addressData.city, addressData.country]
            .filter(Boolean)
            .join(', ')}
        </p>
        <button
          type="button"
          className="pin-accuracy-next"
          disabled={!pin || busy}
          onClick={() => {
            if (!pin) return;
            onConfirm({
              address: addressData.address,
              city: addressData.city,
              country: addressData.country,
              latitude: pin.lat,
              longitude: pin.lng,
            });
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
