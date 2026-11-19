const browserPaths = [
  /^app\//,
  /^public\//,
  /^models\//,
  /^worker\//,
  /^(?:vite|next|tsconfig|postcss|tailwind)\.[^/]+$/,
];

const buildPaths = [
  ...browserPaths,
  /^package(?:-lock)?\.json$/,
  /^serve-local\.mjs$/,
  /^sync-client-assets\.mjs$/,
];

const desktopPaths = [
  /^scripts\/desktop-/,
  /^scripts\/launch-desktop\.ps1$/,
  /^scripts\/refresh-desktop-assets\.ps1$/,
  /^Wohnungsplaner starten\.cmd$/,
  /^start-wohnungsplaner\.ps1$/,
];

const extensionPaths = [
  /^(?:extension|extensions|browser-extension|browser-extensions)\//,
];

function normalizeChangedPath(value) {
  return String(value).trim().replaceAll('\\', '/').replace(/^\.\//, '');
}

function matchesAny(paths, value) {
  return paths.some((pattern) => pattern.test(value));
}

export function classifyChangedFiles(changedFiles) {
  const files = [...new Set((changedFiles ?? []).map(normalizeChangedPath).filter(Boolean))];
  const extensionRefreshRequired = files.some((file) => matchesAny(extensionPaths, file));
  const desktopAssetsRequired = files.some((file) => matchesAny(desktopPaths, file));
  const buildRequired = files.some((file) => matchesAny(buildPaths, file)) || extensionRefreshRequired;
  const browserSmokeRequired = files.some((file) => matchesAny(browserPaths, file));
  const extensionOnly = extensionRefreshRequired && files.every((file) => matchesAny(extensionPaths, file));
  const desktopRunRequired = desktopAssetsRequired || (buildRequired && !extensionOnly);
  const actions = [];

  if (buildRequired) actions.push('build');
  if (browserSmokeRequired) actions.push('browser-smoke');
  if (desktopAssetsRequired) actions.push('desktop-assets');
  if (extensionRefreshRequired) actions.push('extension-refresh');
  if (desktopRunRequired) actions.push('desktop-update-and-run');

  return {
    changedFiles: files,
    buildRequired,
    browserSmokeRequired,
    desktopAssetsRequired,
    desktopRunRequired,
    extensionRefreshRequired,
    actions,
  };
}
