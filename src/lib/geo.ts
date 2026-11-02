export type Point = { lat: number; lng: number };
export const TOULOUSE: Point = { lat: 43.6047, lng: 1.4442 };
export function distanceKm(a: Point, b: Point): number {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat), dLng = radians(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)));
}
