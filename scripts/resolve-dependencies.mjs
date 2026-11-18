// Resolve reproducible npm packages from the sibling generated workspace.
// No source-tree node_modules directory, junctions, or symlinks are required.
// Requires Node.js 24+ (synchronous module registerHooks API).
import { createRequire, registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mainGenerated = path.resolve(projectRoot, '..', 'Wohnungsplaner_Generated');
const transitional = path.join(projectRoot, 'Wohnungsplaner_Generated');
const generatedRoot = existsSync(path.join(mainGenerated, 'dependencies', 'node_modules')) ? mainGenerated : transitional;
const virtualParent = pathToFileURL(path.join(generatedRoot, 'dependencies', '_resolve.mjs')).href;
const dependencyRequire = createRequire(virtualParent);
function bare(specifier) {
  return !specifier.startsWith('.') && !specifier.startsWith('/') &&
    !specifier.startsWith('file:') && !specifier.startsWith('node:') &&
    !/^[A-Za-z]:[\\/]/.test(specifier);
}
if (typeof registerHooks !== 'function') {
  throw new Error('Wohnungsplaner benoetigt Node 24 oder neuer fuer linkfreie Paketaufloesung.');
}
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (!bare(specifier) ||
          !['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'].includes(error.code)) throw error;
      if (context.conditions?.includes('require')) {
        return { url: pathToFileURL(dependencyRequire.resolve(specifier)).href, shortCircuit: true };
      }
      return nextResolve(specifier, { ...context, parentURL: virtualParent });
    }
  },
});
