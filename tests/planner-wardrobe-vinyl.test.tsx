import assert from "node:assert/strict";
import { render, screen, within } from "@testing-library/react";
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
      const lookupName = name === "Duschvorhang Nordic Leinenoptik Beige" ? "Duschvorhang Stoff Beige · 180 × 200 cm" : name;
      const lookupDimension = name === "Duschvorhang Nordic Leinenoptik Beige" ? "180 × 200 cm" : dimension;
      const lookupGalleryFile = name === "Duschvorhang Nordic Leinenoptik Beige" ? "temu-shower-curtain-601100062257123.png" : galleryFile;
      const product = screen.getByRole("heading", { name: lookupName }).closest("article");
      assert.ok(product);
      assert.match(product.textContent ?? "", new RegExp(lookupDimension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      const gallerySource = product.querySelector("img")?.getAttribute("src")
        ?? within(product).getByRole("link", { name: /Produktbild öffnen/ }).getAttribute("href");
      assert.match(gallerySource ?? "", new RegExp(lookupGalleryFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      const purchaseUrl = product.querySelector("a")?.getAttribute("href") ?? "";
      if (name === "Duschvorhang Nordic Leinenoptik Beige") {
        assert.equal(purchaseUrl, "https://de.aliexpress.com/item/1005005852015457.html");
      } else {
        assert.match(purchaseUrl, /top_gallery_url=/);
      }
    }
  });
  test("shows the 4-pack of oak-and-black bathroom hooks and the 180 × 200 cm washable curtain", () => {
    render(<ShoppingListDrawer onClose={() => undefined} />);
    const hooks = screen.getByRole("heading", { name: /4 runde Kleider- und Handtuchhaken/ }).closest("article");
    assert.ok(hooks);
    assert.match(hooks.textContent ?? "", /(?:5,34\s*€|€\s*5,34)/);
    assert.match(hooks.textContent ?? "", /1 Packung = 4 Haken/);
    assert.match(hooks.textContent ?? "", /4PCS.*Style2/);
    assert.match(hooks.querySelector("a")?.getAttribute("href") ?? "", /1005013057225398\.html$/);
    assert.match(hooks.querySelector("img")?.getAttribute("src") ?? "", /aliexpress-bath-hooks-1005013057225398-style2\.jpg$/);

    const curtain = screen.getByRole("heading", { name: "Duschvorhang Stoff Beige · 180 × 200 cm" }).closest("article");
    assert.ok(curtain);
    assert.match(curtain.textContent ?? "", /12 Metallhaken/);
    assert.match(curtain.querySelector("a")?.getAttribute("href") ?? "", /1005005852015457.html$/);
  });

  test("lists the darker AliExpress double-shelf holder with the requested price and correct image", () => {
    render(<ShoppingListDrawer onClose={() => undefined} />);
    const product = screen.getByRole("heading", { name: /Dunklere Holz-Doppelablage mit schwarzem Toilettenpapierhalter/ }).closest("article");
    assert.ok(product);
    assert.match(product.textContent ?? "", /16,99 × 13,97 cm/);
    assert.match(product.textContent ?? "", /14,98 cm/);
    assert.match(product.textContent ?? "", /9,39 cm/);
    assert.match(product.textContent ?? "", /12,21\s*€/);
    assert.match(product.querySelector("img")?.getAttribute("src") ?? "", /aliexpress-wc-paper-holder-1005013624521211\.svg$/);
    assert.equal(product.querySelector("a")?.getAttribute("href"), "https://de.aliexpress.com/item/1005013624521211.html");
  });

});
