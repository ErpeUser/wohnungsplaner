/** Shared by 2D, 3D and product previews; this module has no Three dependency. */
let liveAssetUrls = new Map<string, string>();

export function setPlannerLiveAssetUrls(entries: Iterable<{ path: string; url?: string }>) {
  liveAssetUrls = new Map([...entries].flatMap((entry) => entry.url ? [[entry.path, entry.url] as const] : []));
}

export function plannerAssetUrl(path: string): string {
  return liveAssetUrls.get(path) ?? path;
}
