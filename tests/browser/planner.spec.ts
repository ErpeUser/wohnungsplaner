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

test('table model and extension can be applied through comparison controls', async ({ page }, info) => {
  await startPlanner(page);
  await page.locator('details.planner-table-compare').first().locator('summary').click();
  await page.getByRole('tab', { name: /Kaufland 120/ }).click();
  const dimensionImage = page.locator('img[src="/planner-assets/references/tables/kaufland-567080013/dimensions.jpg"]');
  await expect(dimensionImage).toBeVisible();
  await expect.poll(() => dimensionImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await screenshot(page, info, 'table-kaufland-dimensions');
  await page.getByRole('tab', { name: /AliExpress 100/ }).click();
  const variants = page.getByRole('tablist', { name: 'Ausziehstufen' });
  await variants.getByRole('tab').last().click();
  await page.getByRole('button', { name: 'Im Grundriss anwenden', exact: true }).click();
  await expect.poll(async () => (await savedDocument(page)).placements.find((item) => item.id === 'living-bozan-table')?.catalogId).toBe('dining-table-aliexpress-100-140');
  const table = (await savedDocument(page)).placements.find((item) => item.id === 'living-bozan-table')!;
  expect(table.size.width).toBe(1.4);
  expect(table.size.depth).toBe(1);
  await collapseComparisons(page);
  await screenshot(page, info, 'table-aliexpress-extended-applied');
});

test('chair comparison replaces four seats and leaves table unchanged', async ({ page }, info) => {
  await startPlanner(page);
  const originalTable = (await savedDocument(page)).placements.find((item) => item.id === 'living-bozan-table');
  await page.locator('details.planner-chair-compare summary').click();
  await page.getByRole('tab', { name: /Temu Kunstleder/ }).click();
  await page.getByRole('button', { name: 'Vier Stühle im Grundriss anwenden' }).click();
  await expect.poll(async () => (await savedDocument(page)).placements.filter((item) => item.catalogId === 'chair-temu-faux-leather-metal').length).toBe(4);
  expect((await savedDocument(page)).placements.find((item) => item.id === 'living-bozan-table')).toEqual(originalTable);
  await collapseComparisons(page);
  await screenshot(page, info, 'four-temu-chairs-applied');
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

test('2D and 3D render real pixels and can switch back', async ({ page }, info) => {
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
