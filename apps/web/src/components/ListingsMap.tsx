import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ListingSummary } from '../api/listings';
import {
  APPROXIMATE_RADIUS_M,
  gestureHandling,
  useGoogleMapsApi,
  type MapsApi,
} from './googleMaps';

type Props = {
  listings: ListingSummary[];
  /** Search location — used when no listing has coordinates. */
  center: { lat: number; lng: number } | null;
  /** Passed through to the listing route so back-navigation keeps the search. */
  linkState?: unknown;
};

type PinnedListing = {
  listing: ListingSummary;
  position: google.maps.LatLngLiteral;
};

/** Price pill anchored to a lat/lng, drawn as real HTML so we can style it. */
function createPriceMarker(
  api: MapsApi,
  position: google.maps.LatLngLiteral,
  element: HTMLElement,
) {
  class PriceMarker extends api.maps.OverlayView {
    onAdd() {
      this.getPanes()?.floatPane.appendChild(element);
    }

    draw() {
      const point = this.getProjection()?.fromLatLngToDivPixel(
        new api.core.LatLng(position),
      );
      if (!point) return;
      element.style.left = `${point.x}px`;
      element.style.top = `${point.y}px`;
    }

    onRemove() {
      element.remove();
    }
  }

  return new PriceMarker();
}

export default function ListingsMap({ listings, center, linkState }: Props) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<google.maps.OverlayView[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const { api, failed } = useGoogleMapsApi();

  // Latest values without forcing the marker effect to re-run on every render.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const linkStateRef = useRef(linkState);
  linkStateRef.current = linkState;

  // Callers pass a fresh object literal each render; compare by value so the
  // markers aren't torn down and rebuilt every time.
  const centerLat = center?.lat ?? null;
  const centerLng = center?.lng ?? null;
  const stableCenter = useMemo(
    () =>
      centerLat != null && centerLng != null
        ? { lat: centerLat, lng: centerLng }
        : null,
    [centerLat, centerLng],
  );

  const pinned = useMemo<PinnedListing[]>(
    () =>
      listings
        .filter(
          (listing) =>
            typeof listing.latitude === 'number' &&
            typeof listing.longitude === 'number' &&
            !Number.isNaN(listing.latitude) &&
            !Number.isNaN(listing.longitude),
        )
        .map((listing) => ({
          listing,
          // Already approximated by the API — never the host's exact address.
          position: {
            lat: listing.latitude as number,
            lng: listing.longitude as number,
          },
        })),
    [listings],
  );

  useEffect(() => {
    if (!api || !containerRef.current || mapRef.current) return;

    mapRef.current = new api.maps.Map(containerRef.current, {
      center: stableCenter ?? { lat: 49.8951, lng: -97.1384 }, // Winnipeg
      zoom: 11,
      mapId: import.meta.env.VITE_GOOGLE_MAPS_ID || undefined,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: gestureHandling(),
    });

    // One reusable circle, moved to whichever pin is hovered or focused.
    circleRef.current = new api.maps.Circle({
      map: mapRef.current,
      radius: APPROXIMATE_RADIUS_M,
      visible: false,
      clickable: false,
      strokeColor: '#19ac9d',
      strokeOpacity: 0.5,
      strokeWeight: 1.5,
      fillColor: '#19ac9d',
      fillOpacity: 0.12,
    });
  }, [api, stableCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!api || !map) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    pinned.forEach(({ listing, position }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fyc-pin';
      button.textContent = `$${Math.round(listing.pricePerDay)}`;
      button.setAttribute(
        'aria-label',
        `${listing.title} — $${Math.round(listing.pricePerDay)} per day`,
      );
      button.addEventListener('click', () => {
        navigateRef.current(`/find-your-car/${listing.id}`, {
          state: linkStateRef.current,
        });
      });

      const showArea = () => {
        const circle = circleRef.current;
        if (!circle) return;
        circle.setCenter(position);
        circle.setVisible(true);
      };
      const hideArea = () => circleRef.current?.setVisible(false);

      button.addEventListener('mouseenter', showArea);
      button.addEventListener('focus', showArea);
      button.addEventListener('mouseleave', hideArea);
      button.addEventListener('blur', hideArea);

      const overlay = createPriceMarker(api, position, button);
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    if (pinned.length > 1) {
      const bounds = new api.core.LatLngBounds();
      pinned.forEach(({ position }) => bounds.extend(position));
      map.fitBounds(bounds, 64);
    } else if (pinned.length === 1) {
      map.setCenter(pinned[0].position);
      map.setZoom(13);
    } else if (stableCenter) {
      map.setCenter(stableCenter);
      map.setZoom(11);
    }

    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
      circleRef.current?.setVisible(false);
    };
  }, [api, pinned, stableCenter]);

  if (failed) {
    return (
      <div className="fyc-map-placeholder">
        <p>Map unavailable</p>
        <span>We couldn&apos;t load the map. Results are listed alongside.</span>
      </div>
    );
  }

  return <div className="fyc-map-canvas" ref={containerRef} />;
}
