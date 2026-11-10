import assert from "node:assert/strict";
import { render, screen } from "@testing-library/react";
import { describe, test } from "vitest";

import { getWardrobeFrontLayout } from "../app/planner/scene-3d/furniture.tsx";
import { ShoppingListDrawer } from "../app/planner/workspace/shopping-list-drawer.tsx";

describe("Zimmer 1 wardrobe vinyl", () => {
  test("uses the warm beige vinyl finish on all four former black drawer fronts", () => {
    const drawerModules = getWardrobeFrontLayout().filter((module) => module.kind === "drawers");

    assert.equal(drawerModules.length, 2);
    assert.ok(drawerModules.every((module) => module.finish === "vinyl-cashmere-cream"));
  });

  test("lists the verified cut plan without inventing a Temu price", () => {
    render(<ShoppingListDrawer onClose={() => undefined} />);

    const heading = screen.getByRole("heading", { name: "Selbstklebende Möbelfolie Kaschmir/Creme" });
    const product = heading.closest("article");
    assert.ok(product);
    assert.match(product.textContent ?? "", /Zimmer 1.*601099691023748/);
    assert.match(product.textContent ?? "", /4 Fronten.*41,9 × 30,8 cm/);
    assert.match(product.textContent ?? "", /0,52 m².*0,60 m².*45 × 150 cm/);
    assert.match(product.textContent ?? "", /Preis bei Temu prüfen/);
    assert.equal(
      product.querySelector("a")?.getAttribute("href"),
      "https://www.temu.com/at/selbstklebende-abziehbare-vinyl-tapete-fur-schranke-kleiderschranke--strukturierte-peel-stick-paneele-wasserdichte-feuchtigkeitsbestandige-abdeckung-diy--mit-einfacher-installation-kein-kleber-werkzeug-erforderlich-renovierung-dachdeckung-g-601099691023748.html",
    );
  });

  test("keeps the supplied Temu variants, dimensions, and gallery sources", () => {
    render(<ShoppingListDrawer onClose={() => undefined} />);

    const expectedProducts = [
      ["Verstellbare Duschvorhangstange Brilliant Silber", "171–210 cm", "ea6eba656ec54de9b4573e862fd03670-goods.jpeg"],
      ["Duschvorhang Nordic Leinenoptik Beige", "180 × 200 cm", "8c9546b8-32e0-4a61-8592-59984629b463.jpg"],
      ["Kunstkaninchen-Plüschteppich Elfenbein", "SKU 17592283638107", "24fbeb33-a33d-452e-a545-2a62168e7da4.jpg"],
      ["Vorraumteppich Taupe-Kreisbögen", "120 × 180 cm", "ef8fa5769f22493ea60088b637079477-goods.jpeg"],
      ["Selbstklebende Tapete Macaron Milchkaffee", "600 × 40 cm", "59d4ac36-1c9c-4498-b39f-6fdac2fe25c4.jpg"],
      ["Selbstklebende Tapete in warmbeiger Stoffstruktur", "10,0 m × 44,96 cm", "096428a6-7815-47e1-8e90-66928505c704.jpg"],
    ] as const;

    for (const [name, dimension, galleryFile] of expectedProducts) {
      const product = screen.getByRole("heading", { name }).closest("article");
      assert.ok(product);
      assert.match(product.textContent ?? "", new RegExp(dimension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(product.querySelector("img")?.getAttribute("src") ?? "", new RegExp(galleryFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(product.querySelector("a")?.getAttribute("href") ?? "", /top_gallery_url=/);
    }
  });
});
