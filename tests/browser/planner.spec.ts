import { test, expect, savedDocument, screenshot, startPlanner, collapseComparisons, assertRendered } from './support.ts';

const chairId = 'living-kaleo-chair-west';

test('one chair moves independently and survives undo redo and reload', async ({ page }, info) => {
  await startPlanner(page);
  await page.getByLabel('Planobjekt auswählen').selectOption(chairId);
  const initial = await savedDocument(page);
  const chair = initial.placements.find((item) => item.id === chairId)!;
  const input = page.getByRole('spinbutton', { name: 'Position X in Zentimetern', exact: true });
  await input.fill(String(chair.position.x * 100 + 10));
  await input.press('Enter');
  await expect(input).toHaveValue('230');
  await expect.poll(async () => (await savedDocument(page)).placements.find((item) => item.id === chairId)?.position.x).toBeCloseTo(2.3, 6);
  const moved = await savedDocument(page);
  expect(moved.placements.filter((item) => item.id !== chairId)).toEqual(initial.placements.filter((item) => item.id !== chairId));
  expect(moved.placements.find((item) => item.id === chairId)?.rotation).toBe(chair.rotation);
  await screenshot(page, info, 'chair-independent-move');
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  await expect(input).toHaveValue('220');
  await page.getByRole('button', { name: 'Wiederholen', exact: true }).click();
  await expect(input).toHaveValue('230');
  await expect.poll(async () => (await savedDocument(page)).placements.find((item) => item.id === chairId)?.position.x).toBeCloseTo(2.3, 6);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const inspectorOpen = page.getByRole('button', { name: 'Eigenschaften einblenden' });
  if (await inspectorOpen.count()) await inspectorOpen.click();
  await page.getByLabel('Planobjekt auswählen').selectOption(chairId);
  await expect(input).toHaveValue('230');
  const reloaded = await savedDocument(page);
  expect(reloaded.placements.filter((item) => item.id !== chairId)).toEqual(initial.placements.filter((item) => item.id !== chairId));
  await screenshot(page, info, 'chair-move-restored-after-reload');
});

test('table model and extension can be applied through compact controls', async ({ page }, info) => {
  await startPlanner(page);
  await page.getByLabel('Planobjekt auswählen').selectOption('living-bozan-table');
  await page.getByRole('tab', { name: 'Tischmodell ändern', exact: true }).click();
  await page.getByRole('combobox', { name: 'Tischmodell', exact: true }).selectOption('kaufland-567080013-120-160');
  await page.getByText('Produktbelege und Unsicherheiten', { exact: true }).click();
  const dimensionImage = page.locator('.planner-model-evidence img[src="/planner-assets/references/tables/kaufland-567080013/dimensions.jpg"]');
  await expect(dimensionImage).toBeVisible();
  await expect.poll(() => dimensionImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await screenshot(page, info, 'table-kaufland-dimensions');
  await page.getByRole('combobox', { name: 'Tischmodell', exact: true }).selectOption('aliexpress-100-140');
  await page.getByRole('combobox', { name: 'Ausziehzustand', exact: true }).selectOption('extended');
  await page.getByRole('button', { name: 'Auf diesen Tisch anwenden', exact: true }).click();
  await expect.poll(async () => (await savedDocument(page)).placements.find((item) => item.id === 'living-bozan-table')?.catalogId).toBe('dining-table-aliexpress-100-140');
  const table = (await savedDocument(page)).placements.find((item) => item.id === 'living-bozan-table')!;
  expect(table.size.width).toBe(1.4);
  expect(table.size.depth).toBe(1);
  await collapseComparisons(page);
  await screenshot(page, info, 'table-aliexpress-extended-applied');
});

test('chair model changes only the selected east seat and persists with undo redo', async ({ page }, info) => {
  await startPlanner(page);
  const target = 'living-kaleo-chair-east';
  const initial = await savedDocument(page);
  await page.getByLabel('Planobjekt auswählen').selectOption(target);
  await page.getByRole('tab', { name: 'Stuhlmodell ändern', exact: true }).click();
  await page.getByRole('combobox', { name: 'Stuhlmodell', exact: true }).selectOption('temu-faux-leather-metal');
  await page.getByRole('button', { name: 'Auf diesen Stuhl anwenden', exact: true }).click();
  await expect.poll(async () => (await savedDocument(page)).placements.find((item) => item.id === target)?.catalogId).toBe('chair-temu-faux-leather-metal');
  const changed = await savedDocument(page);
  expect(changed.placements.filter((item) => item.id.startsWith('living-kaleo-chair-'))).toHaveLength(4);
  expect(changed.placements.filter((item) => item.id !== target)).toEqual(initial.placements.filter((item) => item.id !== target));
  await screenshot(page, info, 'single-temu-chair-applied');
  await page.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  await expect.poll(async () => (await savedDocument(page)).placements).toEqual(initial.placements);
  await page.getByRole('button', { name: 'Wiederholen', exact: true }).click();
  await expect.poll(async () => (await savedDocument(page)).placements).toEqual(changed.placements);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(async () => (await savedDocument(page)).placements).toEqual(changed.placements);
});

test('model switcher tabs keep keyboard focus and inspector scrolling local', async ({ page }, info) => {
  await startPlanner(page);
  await page.getByLabel('Planobjekt auswählen').selectOption(chairId);
  const chairTab = page.getByRole('tab', { name: 'Stuhlmodell ändern', exact: true });
  const tableTab = page.getByRole('tab', { name: 'Tischmodell ändern', exact: true });
  await expect(chairTab).toHaveAttribute('aria-selected', 'true');
  await chairTab.press('ArrowRight');
  await expect(tableTab).toHaveAttribute('aria-selected', 'true');
  await expect(tableTab).toHaveAttribute('tabindex', '0');
  await expect(page.locator('#planner-table-model-panel')).toHaveAttribute('aria-labelledby', 'planner-table-model-tab');
  await expect(page.locator('.planner-panel--inspector')).toHaveCSS('overflow-y', 'auto');
  await screenshot(page, info, 'model-switcher-keyboard-scroll');
});

test('catalog material change is saved and restored', async ({ page }, info) => {
  await startPlanner(page);
  await page.getByRole('combobox', { name: 'Raum', exact: true }).selectOption('wohnkueche');
  await page.getByRole('button', { name: /Katalog einblenden/ }).click();
  await page.getByRole('button', { name: 'Stuhl hinzufügen', exact: true }).click();
  const material = page.getByRole('combobox', { name: 'Material', exact: true });
  await expect(material).toBeVisible();
  const options = await material.locator('option').evaluateAll((items) => items.map((item) => (item as HTMLOptionElement).value));
  expect(options.length).toBeGreaterThan(1);
  const chosen = options[1];
  await material.selectOption(chosen);
  const selected = await page.getByLabel('Planobjekt auswählen').inputValue();
  await expect.poll(async () => (await savedDocument(page)).placements.find((item) => item.id === selected)?.materialVariants?.main).toBe(chosen);
  await screenshot(page, info, 'material-change-saved');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByLabel('Planobjekt auswählen').selectOption(selected);
  await expect(material).toHaveValue(chosen);
});

test('bathroom renders the white-gold marble finish', async ({ page }, info) => {
  await startPlanner(page);
  await page.getByRole('combobox', { name: 'Raum', exact: true }).selectOption('bad');
  const texture = page.waitForResponse((response) => response.url().includes('temu-white-gold-601100207687761.webp'));
  await page.getByRole('button', { name: '3D-Ansicht', exact: true }).click();
  expect((await texture).ok()).toBe(true);
  const canvas = page.locator('canvas[aria-label="3D-Planungsfläche"]');
  await expect(canvas).toHaveAttribute('data-render-ready', 'true', { timeout: 60_000 });
  await assertRendered(page, canvas);
  await screenshot(page, info, 'bath-white-gold-marble');
});

test('WC renders the current ivory ceramic design and keeps Onyx as an alternative', async ({ page }, info) => {
  await startPlanner(page);
  await page.getByRole('combobox', { name: 'Raum', exact: true }).selectOption('wc');
  await page.getByRole('button', { name: '3D-Ansicht', exact: true }).click();
  const canvas = page.locator('canvas[aria-label="3D-Planungsfläche"]');
  await expect(canvas).toHaveAttribute('data-render-ready', 'true', { timeout: 60_000 });
  await assertRendered(page, canvas);
  await screenshot(page, info, 'wc-ivory-ceramic-tiles');
  await page.getByRole('button', { name: 'Einkaufsliste öffnen' }).click();
  await expect(page.getByText(/20 Stück · bisherige Onyx-Alternative für die mittlere WC-Rückwand/)).toBeVisible();
});

test('Zimmer 1 renders the AliExpress WOLTU nightstand in 3D', async ({ page }, info) => {
  await startPlanner(page);
  await page.getByRole('combobox', { name: 'Raum', exact: true }).selectOption('zimmer1');
  await page.getByRole('button', { name: '3D-Ansicht', exact: true }).click();
  const canvas = page.locator('canvas[aria-label="3D-Planungsfläche"]');
  await expect(canvas).toHaveAttribute('data-render-ready', 'true', { timeout: 60_000 });
  await assertRendered(page, canvas);
  await screenshot(page, info, 'zimmer1-woltu-nightstand');
});

test('2D and 3D render real pixels and can switch back', async ({ page }, info) => {
  test.setTimeout(180_000);
  await startPlanner(page);
  await screenshot(page, info, 'planner-2d-overview');
  await page.getByRole('button', { name: '3D-Ansicht', exact: true }).click();
  const canvas = page.locator('canvas[aria-label="3D-Planungsfläche"]');
  await expect(canvas).toHaveAttribute('data-render-ready', 'true', { timeout: 120_000 });
  await assertRendered(page, canvas);
  await screenshot(page, info, 'planner-3d-overview');
  await page.getByRole('button', { name: '2D-Ansicht', exact: true }).click();
  await expect(page.getByLabel('Planobjekt auswählen')).toBeVisible();
});

test('desktop panels and export dialog can be opened and closed', async ({ page }, info) => {
  await startPlanner(page);
  await page.getByRole('button', { name: 'Details öffnen' }).click();
  await expect(page.locator('#planner-details')).toBeVisible();
  await screenshot(page, info, 'desktop-details-panel');
  await page.getByRole('button', { name: 'Details schließen' }).click();
  await page.getByRole('button', { name: 'Einkaufsliste öffnen' }).click();
  await expect(page.getByRole('dialog', { name: /Einkaufsliste/ })).toBeVisible();
  await screenshot(page, info, 'desktop-shopping-panel');
  await page.getByRole('button', { name: 'Einkaufsliste schließen' }).click();
  await page.getByRole('button', { name: 'Export & Import' }).click();
  await expect(page.getByRole('button', { name: 'JSON-Sicherung', exact: true })).toBeVisible();
  await screenshot(page, info, 'desktop-export-dialog');
  await page.getByRole('button', { name: 'Export schließen' }).click();
  await expect(page.getByRole('button', { name: 'JSON-Sicherung', exact: true })).toBeHidden();
});

test('mobile inspector and catalog remain usable without horizontal overflow', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startPlanner(page, { mobile: true });
  await screenshot(page, info, 'mobile-2d-overview');
  await page.getByLabel('Planobjekt auswählen').selectOption(chairId);
  await page.getByRole('button', { name: 'Eigenschaften einblenden' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Position X in Zentimetern' })).toBeVisible();
  await screenshot(page, info, 'mobile-chair-inspector');
  // The inspector overlays the backdrop. Click the exposed strip beside it.
  await page.getByRole('button', { name: 'Seitenbereich schließen' }).click({ position: { x: 5, y: 350 } });
  await expect(page.getByRole('spinbutton', { name: 'Position X in Zentimetern' })).toBeHidden();
  await page.getByRole('button', { name: 'Katalog einblenden' }).click();
  await expect(page.getByRole('searchbox', { name: 'Möbel suchen' })).toBeVisible();
  await screenshot(page, info, 'mobile-catalog-panel');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('every room renders in 2D and in the real 3D canvas', async ({ page }, info) => {
  test.setTimeout(18 * 60_000);
  await startPlanner(page);
  const selector = page.getByRole('combobox', { name: 'Raum', exact: true });
  const rooms = await selector.locator('option[value]').evaluateAll((items) =>
    items.map((item) => (item as HTMLOptionElement).value).filter(Boolean));
  // The public plan includes seven interior rooms and the balcony/loggia.
  // Zimmer 1 must remain available in both 2D and 3D.
  expect(rooms).toHaveLength(8);
  expect(rooms).toContain('zimmer1');
  for (const roomId of rooms) {
    await page.getByRole('button', { name: '2D-Ansicht', exact: true }).click();
    await selector.selectOption(roomId);
    await expect(selector).toHaveValue(roomId);
    await screenshot(page, info, `room-${roomId}-2d`);
    await page.getByRole('button', { name: '3D-Ansicht', exact: true }).click();
    const canvas = page.locator('canvas[aria-label="3D-Planungsfläche"]');
    await expect(canvas).toHaveAttribute('data-render-ready', 'true', { timeout: 120_000 });
    await assertRendered(page, canvas);
    await screenshot(page, info, `room-${roomId}-3d`);
  }
});

test('JSON export and import round trip is isolated from user storage', async ({ page }, info) => {
  await startPlanner(page);
  const before = await savedDocument(page);
  await page.getByRole('button', { name: 'Export & Import' }).click();
  const ready = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON-Sicherung', exact: true }).click();
  const download = await ready;
  const file = info.outputPath('plan-export.json');
  await download.saveAs(file);
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles(file);
  await expect(page.getByRole('heading', { name: 'Importvorschau' })).toBeVisible();
  await screenshot(page, info, 'json-import-preview');
  await page.getByRole('button', { name: 'Plan ersetzen' }).click();
  await expect.poll(async () => (await savedDocument(page)).placements).toEqual(before.placements);
  await screenshot(page, info, 'json-import-confirmed');
});
