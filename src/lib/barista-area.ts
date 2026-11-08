import communes from "../../config/communes-haute-garonne.json";
import { distanceKm, type Point } from "./geo";
import { fold } from "./job-taxonomy";

export const BARISTA_AREAS = [
  {
    id: "haute-garonne",
    label: "Haute-Garonne · Toulouse et environs",
    franceTravail: "31D",
    helloWork: "Haute-Garonne",
  },
  {
    id: "agen",
    label: "Agen et environs · 30 km",
    franceTravail: "47001",
    helloWork: "Agen",
    center: { lat: 44.2031, lng: 0.6164 },
  },
  {
    id: "bordeaux",
    label: "Bordeaux et environs · 30 km",
    franceTravail: "33063",
    helloWork: "Bordeaux",
    center: { lat: 44.8378, lng: -0.5792 },
  },
] as const;
const normalizeCity = (city: string) =>
  fold(city.replace(/\s*\(?\d{2,5}\)?\s*$/, "").replace(/\s*[-,]\s*$/, ""));
const names = new Set(communes.map((commune) => fold(commune.nom)));

/** Périmètre barista demandé : département 31, Agen et Bordeaux à 30 km. */
export function isBaristaArea(input: {
  city: string;
  latitude?: number | null;
  longitude?: number | null;
}): boolean {
  const name = normalizeCity(input.city);
  const postal = input.city.match(/\b(\d{5})\b/)?.[1];
  const hasPoint =
    input.latitude != null &&
    input.longitude != null &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude);
  const point: Point | null = hasPoint ? { lat: input.latitude!, lng: input.longitude! } : null;
  if (postal?.startsWith("31")) return true;
  if (names.has(name) && (!postal || postal.startsWith("31"))) {
    if (!point) return true;
    // Une homonyme explicitement géocodée ailleurs ne devient pas une commune du 31.
    const commune = communes.find((entry) => fold(entry.nom) === name)!;
    if (
      distanceKm(point, {
        lat: commune.centre.coordinates[1],
        lng: commune.centre.coordinates[0],
      }) <= 15
    )
      return true;
  }
  if (["agen", "bordeaux"].includes(name)) return true;
  return (
    !!point &&
    BARISTA_AREAS.some((area) => "center" in area && distanceKm(point, area.center) <= 30)
  );
}
