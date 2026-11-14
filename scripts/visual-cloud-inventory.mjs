import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REVIEW_MODELS } from '../app/planner/review/review-models.ts';

const root = process.cwd();
const output = path.join(root, 'artifacts', 'visual', 'latest');
const reports = path.join(output, 'report');
const mode = process.argv[2] ?? 'all';
const angles = ['front', 'side', 'back', 'perspective'];
const safe = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '-');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (v) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[v]);
const commit = (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return 'unverified'; } })();
const viewer = new Map(REVIEW_MODELS.map((item) => [item.id, item]));
const viewerByBuiltIn = new Map(REVIEW_MODELS.filter((item) => item.builtIn).map((item) => [item.builtIn.id, item]));
const files = [];
const screenshots = [];
let copyFailures = [];

async function collectImages(directory, prefix) {
  let entries = [];
  try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch { return []; }
  const images = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (!entry.isFile() || !/\.(png|jpe?g|webp|avif|gif)$/i.test(entry.name)) continue;
    const file = path.join(directory, entry.name);
    const stat = await fs.stat(file);
    if (stat.size < 64 || stat.size > 12 * 1024 * 1024) continue;
    const handle = await fs.open(file, 'r');
    const header = Buffer.alloc(24);
    let bytesRead;
    try { ({ bytesRead } = await handle.read(header, 0, header.length, 0)); }
    finally { await handle.close(); }
    const value = header.subarray(0, bytesRead);
    const valid = value.subarray(0, 4).equals(Buffer.from([137, 80, 78, 71]))
      || (value[0] === 255 && value[1] === 216 && value[2] === 255)
      || value.toString('ascii', 0, 4) === 'RIFF'
      || /^GIF8[79]a/.test(value.toString('ascii', 0, 6))
      || (value.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(value.toString('ascii', 8, 20)));
    if (!valid) { copyFailures.push(`Invalid image header: ${file}`); continue; }
    const target = path.join('references', prefix, safe(entry.name));
    await fs.mkdir(path.dirname(path.join(output, target)), { recursive: true });
    await fs.copyFile(file, path.join(output, target));
    images.push({ source: path.relative(root, file).replaceAll('\\', '/'), screenshotReference: target.replaceAll('\\', '/') });
  }
  return images;
}

for (const group of ['products', 'fixed']) {
  const directory = path.join(root, 'models', group);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const base = path.join(directory, entry.name);
    let spec;
    try { spec = JSON.parse(await fs.readFile(path.join(base, 'manifest.json'), 'utf8')); }
    catch { continue; }
    const id = String(spec.id ?? entry.name);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error('Unsafe model manifest ID: ' + id);
    const mapped = group === 'products'
      ? viewer.get(spec.runtime?.catalogId ?? spec.canonicalId ?? id)
      : viewerByBuiltIn.get(id);
    const variants = mapped?.variants.map((item) => item.id) ?? (spec.variants ?? ['default']);
    const images = [
      ...await collectImages(path.join(base, 'Auszug', 'Bilder'), id),
      ...await collectImages(path.join(base, 'references'), id),
    ];
    const expected = mapped ? variants.flatMap((variant) => angles.map((view) => {
      const relative = `models/${safe(mapped.id)}/${safe(mapped.id + '--' + variant + '--' + view)}.png`;
      return { modelId: id, viewerId: mapped.id, variant, view,
        scenario: `model:${id}:${variant}:${view}`,
        screenshot: relative, commit, result: 'not-executed' };
    })) : [];
    for (const shot of expected) {
      if (mode !== 'gui') {
        try { await fs.access(path.join(output, shot.screenshot)); shot.result = 'captured'; }
        catch { shot.result = 'missing'; }
      }
      screenshots.push(shot);
    }
    let links = Array.isArray(spec.sourceUrls) ? spec.sourceUrls : [];
    try {
      const content = await fs.readFile(path.join(base, 'link.txt'), 'utf8');
      links = [...new Set([...links, ...content.split(/\r?\n/).filter((line) => line.startsWith('https://'))])];
    } catch {}
    const completed = expected.length > 0 && expected.every((shot) => shot.result === 'captured');
    files.push({
      modelId: id, viewerId: mapped?.id ?? null, label: spec.displayName ?? mapped?.name ?? id,
      manifest: path.relative(root, path.join(base, 'manifest.json')).replaceAll('\\', '/'),
      kind: group, renderer: spec.runtime?.renderer ?? 'unknown',
      variants, sourceUrls: links, references: images,
      expectedScreenshots: expected.length,
      screenshots: expected,
      coverage: !mapped ? 'not-renderable' : mode === 'gui' ? 'not-executed' : completed ? 'captured' : 'missing',
      fidelity: 'not-reviewed',
    });
  }
}
const testFile = path.join(reports, 'results.json');
let testReport = null;
try { testReport = JSON.parse(await fs.readFile(testFile, 'utf8')); } catch {}
let probe = null;
try { probe = JSON.parse(await fs.readFile(path.join(reports, 'webgl-probe.json'), 'utf8')); } catch {}
const misses = screenshots.filter((item) => item.result === 'missing').length;
const gaps = files.filter((model) => model.coverage === 'not-renderable').length;
const technicalStatus = !testReport || testReport.status !== 'passed' || (process.env.VISUAL_BROWSER_CHANNEL && probe?.status !== 'passed') || misses > 0
  ? 'failed' : gaps && mode !== 'gui' ? 'passed-with-coverage-gaps' : 'passed';
const manifest = {
  schemaVersion: 1, commit, generatedAt: new Date().toISOString(), mode, technicalStatus,
  fidelityStatus: 'not-reviewed', browserProbe: probe, testReport: testReport ? {
    status: testReport.status, tests: testReport.tests.length, errors: testReport.errors,
  } : null,
  coverage: {
    modelManifests: files.length, galleryModels: REVIEW_MODELS.length, unmappedManifests: gaps,
    expectedModelScreenshots: screenshots.length, missingScreenshots: misses,
    capturedScreenshots: screenshots.filter((item) => item.result === 'captured').length,
  },
  diagnostics: { invalidReferenceImages: copyFailures },
  models: files, screenshots,
};
await fs.mkdir(reports, { recursive: true });
await fs.writeFile(path.join(reports, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const figure = (src, name) => `<figure><a href="../${esc(src)}"><img loading="lazy" src="../${esc(src)}" alt="${esc(name)}"></a><figcaption>${esc(name)}</figcaption></figure>`;
const cards = files.map((model) => `<section><h2>${esc(model.label)} · <code>${esc(model.modelId)}</code></h2>
<p>Renderer: ${esc(model.renderer)} · Galerie-ID: ${esc(model.viewerId ?? 'nicht zugeordnet')} · Bildstatus:
<strong>${esc(model.coverage)}</strong> · Produktabgleich: nicht beurteilt</p>
<p>Manifest: <code>${esc(model.manifest)}</code></p>
<p>${model.sourceUrls.map((link) => `<a href="${esc(link)}" rel="noreferrer">${esc(link)}</a>`).join(' · ') || 'Keine Produkt-URL'}</p>
<div class="grid">${model.references.map((ref) => figure(ref.screenshotReference, `Referenz: ${ref.source}`)).join('')}
${model.screenshots.filter((shot) => shot.result === 'captured').map((shot) => figure(shot.screenshot, `${shot.variant}: ${shot.view}`)).join('')}</div></section>`).join('\n');
const html = `<!doctype html><html lang="de"><meta charset="utf-8"><title>Wohnungsplaner · Modellindex</title><style>
body{background:#f7f6f3;color:#242424;font:15px system-ui;margin:24px auto;max-width:1500px;padding:0 20px}
section{border-top:1px solid #aaa;padding:20px 0} .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
figure{margin:0;border:1px solid #ddd;padding:8px}img{width:100%;height:190px;object-fit:contain}
figcaption{font-size:12px;overflow-wrap:anywhere}code{font-size:13px}p{overflow-wrap:anywhere}
</style><h1>Modellprüfung · ${esc(commit)}</h1>
<p>Status ${esc(technicalStatus)} · ${files.length} Modellmanifeste, ${gaps} ohne direkte Galeriezuordnung,
${manifest.coverage.capturedScreenshots} aktuelle Modellaufnahmen, ${misses} fehlende Aufnahmen.</p>
<p>Ein Screenshot ist KEINE Freigabe der Modelltreue. Produktreferenzen können falsche Varianten zeigen.</p>
<p><a href="manifest.json">Maschinenlesbare Zuordnung</a> · <a href="index.html">GUI-Bericht</a></p>${cards}</html>`;
await fs.writeFile(path.join(reports, 'models.html'), html);
try {
  const file = path.join(reports, 'index.html');
  const old = await fs.readFile(file, 'utf8');
  await fs.writeFile(file, old.replace('</h1>', '</h1><p><a href="models.html">Modell-/Referenzindex und Abdeckung ansehen</a></p>'));
} catch {}
console.log(JSON.stringify({ status: technicalStatus, ...manifest.coverage }));
if (technicalStatus === 'failed') process.exitCode = 1;
