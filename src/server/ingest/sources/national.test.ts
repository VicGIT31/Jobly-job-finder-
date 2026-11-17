import { describe, expect, it } from "vitest";
import { nationalPartitions } from "./national";
import { nationalDomain } from "../national-taxonomy";

const catalog = (paths: string[]) => paths.map((path) =>
  `<loc>https://candidat.francetravail.fr${path}</loc>`).join("");

describe("catalogue national", () => {
  it("place l’outre-mer au début et diversifie les métiers à l’intérieur d’un département", () => {
    const rows = nationalPartitions(catalog([
      "/offres/emploi/soudeur/ain/s1m1d1",
      "/offres/emploi/usineur/ain/s1m2d1",
      "/offres/emploi/macon/ain/s2m1d1",
      "/offres/emploi/medecin/guadeloupe/s3m1d971",
      "/offres/emploi/macon/paris/s2m1d75",
    ]), catalog([
      "/rechercheoffre/emploi/industrie/s1", "/rechercheoffre/emploi/btp/s2", "/rechercheoffre/emploi/sante/s3",
    ]));
    expect(rows.map((department) => department[0].department)).toEqual(["971", "1", "75"]);
    expect(new Set(rows[1].slice(0, 2).map(({ sector }) => sector))).toEqual(new Set(["industrie", "btp"]));
    expect(rows[1]).toHaveLength(3);
  });

  it("privilégie un métier explicite et conserve un secteur utile pour un titre ambigu", () => {
    expect(nationalDomain("Infirmière diplômée d’État", "industrie")).toBe("HEALTH");
    expect(nationalDomain("Agent polyvalent", "fonction publique")).toBe("PUBLIC_ADMIN");
    expect(nationalDomain("Chargée de mission", "")).toBeUndefined();
  });
});
