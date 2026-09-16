/** Shared vehicle color options — Find Your Car filters + List Your Ride. */
export const VEHICLE_COLOR_OPTIONS: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Red', hex: '#e53935' },
  { name: 'Blue', hex: '#1e88e5' },
  { name: 'Green', hex: '#43a047' },
  { name: 'Brown', hex: '#8b4513' },
  { name: 'Beige', hex: '#d8c3a5' },
  { name: 'Gold', hex: '#d4af37' },
  { name: 'Yellow', hex: '#f4d03f' },
  { name: 'Orange', hex: '#ff8c00' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Pink', hex: '#e56b9f' },
  { name: 'Burgundy', hex: '#800020' },
];

export function findVehicleColor(name: string) {
  const key = name.trim().toLowerCase();
  if (!key) return undefined;
  if (key === 'grey') {
    return VEHICLE_COLOR_OPTIONS.find((c) => c.name === 'Gray');
  }
  return VEHICLE_COLOR_OPTIONS.find((c) => c.name.toLowerCase() === key);
}
