import { describe, expect, it } from "vitest";
import { selectCatalogDetails } from "./catalog-rotation";

describe("rotation des catalogues limités", () => {
  it("couvre toutes les annonces sur plusieurs cycles tout en relisant les nouveautés", () => {
    const catalog = Array.from(
      { length: 30 },
      (_, i) => [`url-${String(i).padStart(2, "0")}`, ""] as const,
    );
    const seen = new Set<string>();
    let cursor = "";
    for (let i = 0; i < 6; i++) {
      const page = selectCatalogDetails(catalog, 8, cursor);
      expect(page.selected).toHaveLength(8);
      expect(new Set(page.selected.map(([url]) => url)).size).toBe(8);
      expect(page.selected[0][0]).toBe("url-00");
      page.selected.forEach(([url]) => seen.add(url));
      cursor = page.nextCursor;
    }
    expect(seen.size).toBe(30);
  });
  it("reprend après un curseur supprimé et revient au début en fin de catalogue", () => {
    const catalog: [string, string][] = [
      ["a", ""],
      ["c", ""],
      ["d", ""],
    ];
    expect(selectCatalogDetails(catalog, 1, "b").selected[0][0]).toBe("c");
    expect(selectCatalogDetails(catalog, 1, "z").selected[0][0]).toBe("a");
  });
});
