export type SearchLocation = {
  query: string;
  city: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type SearchTripDates = {
  start: string; // ISO
  end: string; // ISO
};

/** Router state passed Home → Find Your Car */
export type SearchNavState = {
  location: SearchLocation;
  dates: SearchTripDates;
  vehicleType?: string[];
};
