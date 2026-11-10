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
});
