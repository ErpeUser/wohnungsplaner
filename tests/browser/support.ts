import { test as base, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { PlannerDocumentV3 } from '../../app/planner/domain/types.ts';

export { expect };

export const test = base.extend<{ runtimeGuard: void }>({
  runtimeGuard: [async ({ page, baseURL }, use) => {
    const failures: string[] = [];
    const isLocal = (url: string) => Boolean(baseURL && url.startsWith(`${baseURL}/`));
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('requestfailed', (request) => {
      const error = request.failure()?.errorText;
      if (isLocal(request.url()) && error !== 'net::ERR_ABORTED') failures.push(`Request failed: ${request.url()} (${error})`);
    });
    page.on('response', (response) => {
      if (isLocal(response.url()) && response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`);
    });
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type()) && /WebGL.*(lost|fail)|context.*lost/i.test(message.text())) failures.push(message.text());
      else if (message.type() === 'error' && (!message.location().url || message.location().url.startsWith(baseURL!))) failures.push(message.text());
    });
    await use();
    expect([...new Set(failures)], 'Browser, resource or WebGL errors').toEqual([]);
  }, { auto: true }],
});

export async function savedDocument(page: Page): Promise<PlannerDocumentV3> {
  await expect.poll(() => page.evaluate(() => localStorage.getItem('wohnung-planner-v3'))).not.toBeNull();
  return page.evaluate(() => JSON.parse(localStorage.getItem('wohnung-planner-v3')!));
}

export async function collapseComparisons(page: Page) {
  for (const panel of await page.locator('details.planner-table-compare').all()) {
    if (await panel.getAttribute('open') !== null) await panel.locator('summary').click();
  }
}

export async function startPlanner(page: Page, options: { mobile?: boolean } = {}) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: '2D-Ansicht', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const catalogClose = page.getByRole('button', { name: 'Katalog ausblenden' });
  if (options.mobile) {
    // Wait for the compact layout effect to close the initially open SSR panels.
    await expect(page.getByRole('button', { name: 'Katalog einblenden' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eigenschaften einblenden' })).toBeVisible();
  } else if (await catalogClose.count()) await catalogClose.click();
  const inspectorOpen = page.getByRole('button', { name: 'Eigenschaften einblenden' });
  if (!options.mobile && await inspectorOpen.count()) await inspectorOpen.click();
  await collapseComparisons(page);
  await expect(page.getByLabel('Planobjekt auswählen')).toBeVisible();
  // Changing room through the UI establishes the initial autosave without seeding storage.
  await page.getByRole('combobox', { name: 'Raum', exact: true }).selectOption('wohnkueche');
  await page.getByRole('combobox', { name: 'Raum', exact: true }).selectOption('');
  await savedDocument(page);
}

export async function screenshot(page: Page, info: TestInfo, name: string, kind = 'gui') {
  await page.evaluate(async () => { await document.fonts.ready; });
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '-');
  const directory = path.resolve('artifacts/visual/latest', kind);
  await mkdir(directory, { recursive: true });
  const screenshotPath = path.join(directory, `${safeName}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: kind === 'gui', animations: 'disabled' });
  await info.attach(safeName, { path: screenshotPath, contentType: 'image/png' });
}

export async function assertRendered(page: Page, canvas: Locator, gallery = false) {
  await expect(canvas).toBeVisible();
  const pixels = await canvas.screenshot({ animations: 'disabled' });
  const stats = await page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const surface = document.createElement('canvas');
    surface.width = image.width;
    surface.height = image.height;
    const context = surface.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const rgba = context.getImageData(0, 0, surface.width, surface.height).data;
    const colors = new Set<number>();
    let dark = 0;
    let foreground = 0;
    for (let index = 0; index < rgba.length; index += 16) {
      colors.add((rgba[index] >> 3) * 1024 + (rgba[index + 1] >> 3) * 32 + (rgba[index + 2] >> 3));
      if (rgba[index] + rgba[index + 1] + rgba[index + 2] < 450) dark++;
      if (Math.abs(rgba[index] - rgba[0]) + Math.abs(rgba[index + 1] - rgba[1]) + Math.abs(rgba[index + 2] - rgba[2]) > 20) foreground++;
    }
    return { width: image.width, height: image.height, colors: colors.size, dark, foreground };
  }, pixels.toString('base64'));
  expect(stats.width).toBeGreaterThan(100);
  expect(stats.height).toBeGreaterThan(100);
  if (gallery) {
    expect(stats.foreground, 'Model pixels must differ from the uniform background').toBeGreaterThan(20);
  } else {
    expect(stats.colors, 'Canvas screenshot must contain rendered geometry, not a blank placeholder').toBeGreaterThan(20);
    expect(stats.dark, 'Canvas screenshot must contain object/shadow pixels').toBeGreaterThan(20);
  }
}
