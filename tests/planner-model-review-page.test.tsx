import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import ModelsPage from "../app/dev/models/page.tsx";

afterEach(() => vi.unstubAllEnvs());

it("renders a requested gallery model and view in the initial page before client effects", async () => {
  vi.stubEnv("PLANNER_REVIEW_ENABLED", "1");
  const page = await ModelsPage({ searchParams: Promise.resolve({ model: "dining-table-aliexpress-100-140", view: "side" }) });
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(page);

  expect(container.querySelector('select[aria-label="Modell"] option[selected]')?.getAttribute("value")).toBe("dining-table-aliexpress-100-140");
  expect(container.querySelector('select[aria-label="Perspektive"] option[selected]')?.getAttribute("value")).toBe("side");
  expect(container.querySelector('[data-testid="model-id"]')?.textContent).toBe("dining-table-aliexpress-100-140");
});

it("keeps unregistered model and view query values out of the gallery", async () => {
  vi.stubEnv("PLANNER_REVIEW_ENABLED", "1");
  const page = await ModelsPage({ searchParams: Promise.resolve({ model: "../../private", view: "unknown" }) });
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(page);

  expect(container.querySelector('select[aria-label="Modell"] option[selected]')?.getAttribute("value")).toBe("chair-kaleo-chenille-beige");
  expect(container.querySelector('select[aria-label="Perspektive"] option[selected]')?.getAttribute("value")).toBe("perspective");
});

it("retains the private review gate even for a valid model query", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("PLANNER_REVIEW_ENABLED", "0");
  await expect(ModelsPage({ searchParams: Promise.resolve({ model: "dining-table-aliexpress-100-140" }) })).rejects.toThrow(/404/);
});
