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
      assert.match(product.querySelector("a")?.getAttribute("href") ?? "", /top_gallery_url=/);
    }
  });
  test("shows the 4-pack of oak-and-black bathroom hooks and the 180 × 200 cm washable curtain", () => {
    render(<ShoppingListDrawer onClose={() => undefined} />);
    const hooks = screen.getByRole("heading", { name: /4 runde Kleider- und Handtuchhaken/ }).closest("article");
    assert.ok(hooks);
    assert.match(hooks.textContent ?? "", /€\s*6,36/);
    assert.match(hooks.textContent ?? "", /1 Packung = 4 Haken/);
    assert.match(hooks.textContent ?? "", /118446205486445/);
    assert.match(hooks.querySelector("a")?.getAttribute("href") ?? "", /goods_id=607039887632432&sku_id=118446205486445/);
    assert.match(hooks.querySelector("img")?.getAttribute("src") ?? "", /temu-oak-black-hooks-607039887632432\.svg$/);

    const curtain = screen.getByRole("heading", { name: "Duschvorhang Stoff Beige · 180 × 200 cm" }).closest("article");
    assert.ok(curtain);
    assert.match(curtain.textContent ?? "", /12 Metallhaken/);
    assert.match(curtain.querySelector("a")?.getAttribute("href") ?? "", /goods_id=601100062257123&sku_id=17594540656721/);
  });

  test("lists the supplied Temu WC oak-and-iron shelf with correct source and single price", () => {
    render(<ShoppingListDrawer onClose={() => undefined} />);
    const product = screen.getByRole("heading", { name: /Wandablage aus Naturholz und schwarzem Eisen mit Toilettenpapierhalter/ }).closest("article");
    assert.ok(product);
    assert.match(product.textContent ?? "", /17 × 14 cm/);
    assert.match(product.textContent ?? "", /15-cm-Papierhalter/);
    assert.match(product.textContent ?? "", /9-cm-Verbindungssteg/);
    assert.match(product.textContent ?? "", /9,75\s*€/);
    assert.match(product.textContent ?? "", /SKU 17595354506975/);
    assert.match(product.querySelector("img")?.getAttribute("src") ?? "", /temu-wc-paper-holder-601100249492431\.svg$/);
    assert.match(product.querySelector("a")?.getAttribute("href") ?? "", /goods_id=601100249492431&sku_id=17595354506975/);
    assert.match(product.querySelector("a")?.getAttribute("href") ?? "", /0aac879c-84e0-4e9a-9220-87e2e075ce21\.jpg/);
  });

});
