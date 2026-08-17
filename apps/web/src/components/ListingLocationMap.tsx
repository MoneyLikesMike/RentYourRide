import { useEffect, useRef } from 'react';
import {
  APPROXIMATE_RADIUS_M,
  gestureHandling,
  useGoogleMapsApi,
} from './googleMaps';

type Props = {
  latitude: number;
  longitude: number;
};

/**
 * Approximate pickup area for a single listing. Only a shaded circle is drawn —
 * no pin — because the exact address isn't shared until a booking is confirmed.
 */
export default function ListingLocationMap({ latitude, longitude }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const { api, failed } = useGoogleMapsApi();

  useEffect(() => {
    if (!api || !containerRef.current) return;
    const center = { lat: latitude, lng: longitude };

    if (!mapRef.current) {
      mapRef.current = new api.maps.Map(containerRef.current, {
        center,
        zoom: 13,
        mapId: import.meta.env.VITE_GOOGLE_MAPS_ID || undefined,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: gestureHandling(),
        zoomControlOptions: {
          position: api.core.ControlPosition.RIGHT_TOP,
        },
      });
      circleRef.current = new api.maps.Circle({
        map: mapRef.current,
        radius: APPROXIMATE_RADIUS_M,
        clickable: false,
        strokeColor: '#19ac9d',
        strokeOpacity: 0.5,
        strokeWeight: 1.5,
        fillColor: '#19ac9d',
        fillOpacity: 0.18,
      });
    }

    mapRef.current.setCenter(center);
    circleRef.current?.setCenter(center);
  }, [api, latitude, longitude]);

  if (failed) return null;

  return (
    <div className="listing-location">
      <div className="listing-location-map" ref={containerRef} />
      <div className="listing-location-fade listing-location-fade--top" aria-hidden />
      <div
        className="listing-location-fade listing-location-fade--bottom"
        aria-hidden
      />
    </div>
  );
}
