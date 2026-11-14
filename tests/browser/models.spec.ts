import { test, expect, assertRendered, screenshot } from './support.ts';

test('model gallery renders requested models from four standard perspectives', async ({ page }, info) => {
  test.setTimeout(15 * 60_000);
  await page.goto('/dev/models', { waitUntil: 'domcontentloaded' });
  const modelSelect = page.getByRole('combobox', { name: 'Modell', exact: true });
  await expect(modelSelect).toBeVisible();
  // SSR exposes the select before its React handlers are attached.
  const canvas = page.locator('canvas[aria-label="Modellvorschau"]');
  await expect(canvas).toHaveAttribute('data-render-ready', 'true', { timeout: 60_000 });
  const all = await modelSelect.locator('option').evaluateAll((options) => options.map((option) => ({ id: (option as HTMLOptionElement).value, name: option.textContent })));
  expect(all.length).toBeGreaterThan(0);
  const filter = process.env.VISUAL_MODEL;
  const models = filter ? all.filter((model) => model.id === filter) : all;
  expect(models.length, `Unknown model: ${filter ?? '(all)'}`).toBeGreaterThan(0);
  const views = process.env.VISUAL_VIEW ? [process.env.VISUAL_VIEW] : ['front', 'side', 'back', 'perspective'];
  for (const model of models) {
    await modelSelect.selectOption(model.id);
    for (const view of views) {
      await page.getByRole('combobox', { name: 'Perspektive', exact: true }).selectOption(view);
      await expect(canvas).toHaveAttribute('data-render-key', new RegExp(`^${model.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:${view}:`));
      await expect(canvas).toHaveAttribute('data-render-ready', 'true', { timeout: 60_000 });
      await assertRendered(page, canvas, true);
      await screenshot(page, info, `${model.id}--${view}`, 'models');
    }
  }
});
