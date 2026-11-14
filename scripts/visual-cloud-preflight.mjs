import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const output = path.resolve('artifacts/visual/latest/report');
await fs.mkdir(output, { recursive: true });
const channel = process.env.VISUAL_BROWSER_CHANNEL;
const result = {
  at: new Date().toISOString(), commit: process.env.VISUAL_COMMIT ?? process.env.GITHUB_SHA ?? null,
  channel, status: 'failed', browserVersion: null, renderer: null, pixelRGBA: null, error: null,
};
let browser;
try {
  if (!['chrome', 'msedge'].includes(channel)) throw new Error('Choose a GitHub preinstalled browser: VISUAL_BROWSER_CHANNEL=chrome or msedge');
  browser = await chromium.launch({
    channel,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  result.browserVersion = browser.version();
  const page = await browser.newPage({ viewport: { width: 650, height: 400 }, deviceScaleFactor: 1 });
  const probe = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    document.body.appendChild(canvas);
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (!gl || gl.isContextLost()) throw new Error('WebGL2 not available');
    gl.viewport(0, 0, 512, 320);
    gl.clearColor(0.14, 0.43, 0.67, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.finish();
    const rgba = new Uint8Array(4);
    gl.readPixels(64, 64, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    if (gl.getError() !== gl.NO_ERROR || rgba[0] < 20 || rgba[1] < 70 || rgba[2] < 110 || rgba[3] !== 255)
      throw new Error('WebGL readPixels did not return the expected coloured frame');
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { rgba: [...rgba], renderer: String(debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) };
  });
  result.renderer = probe.renderer;
  result.pixelRGBA = probe.rgba;
  await page.locator('canvas').screenshot({ path: path.join(output, 'webgl-probe.png') });
  result.status = 'passed';
  console.log('Cloud WebGL preflight OK', JSON.stringify(result));
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
  console.error('Cloud browser/WebGL check failed:', result.error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await fs.writeFile(path.join(output, 'webgl-probe.json'), JSON.stringify(result, null, 2) + '\n');
}
