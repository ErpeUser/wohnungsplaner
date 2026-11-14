import { open, readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { REVIEW_MODELS } from "./review-models.ts";

export type ReviewReferences = { images: { src: string; label: string }[]; links: string[] };
export function isReviewEnabled() {
  return process.env.NODE_ENV === "development" || process.env.PLANNER_REVIEW_ENABLED === "1";
}

function imageType(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (bytes.toString("ascii", 4, 8) === "ftyp" && /avif|avis/.test(bytes.toString("ascii", 8, 40))) return "image/avif";
  if (/^GIF8[79]a/.test(bytes.toString("ascii", 0, 6))) return "image/gif";
  return null;
}

async function modelDirectory(id: string) {
  const model = REVIEW_MODELS.find((item) => item.id === id);
  if (!model) return null;
  const root = await realpath(path.resolve("models")).catch(() => null);
  if (!root) return null;
  const candidate = model.builtIn
    ? path.join(root, "fixed", model.builtIn.id)
    : path.join(root, "products", model.id);
  const directory = await realpath(candidate).catch(() => null);
  return directory?.startsWith(root + path.sep) ? { directory, root } : null;
}

async function imageFiles(id: string) {
  const location = await modelDirectory(id);
  if (!location) return [];
  const folder = await realpath(path.join(location.directory, "Auszug", "Bilder")).catch(() => null);
  if (!folder?.startsWith(location.directory + path.sep)) return [];
  const files = await readdir(folder, { withFileTypes: true }).catch(() => []);
  const images = await Promise.all(files.filter((entry) => entry.isFile()).map(async ({ name }) => {
    const file = path.join(folder, name);
    const details = await stat(file).catch(() => null);
    if (!details || details.size > 12 * 1024 * 1024) return null;
    const handle = await open(file, "r").catch(() => null);
    if (!handle) return null;
    try {
      const { buffer, bytesRead } = await handle.read(Buffer.alloc(48), 0, 48, 0);
      const type = imageType(buffer.subarray(0, bytesRead));
      return type ? { file, type, name } : null;
    } finally { await handle.close(); }
  }));
  return images.filter((entry) => entry !== null).sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export async function readReviewImage(id: string, index: number) {
  if (!isReviewEnabled() || !Number.isSafeInteger(index) || index < 0) return null;
  const image = (await imageFiles(id))[index];
  return image ? { bytes: await readFile(image.file), type: image.type } : null;
}

export async function readReviewReferences(id: string): Promise<ReviewReferences> {
  if (!isReviewEnabled()) return { images: [], links: [] };
  const location = await modelDirectory(id);
  if (!location) return { images: [], links: [] };
  const rawLinks = await readFile(path.join(location.directory, "link.txt"), "utf8").catch(() => "");
  const links = [...new Set(rawLinks.split(/\r?\n/).map((value) => value.trim()).filter((value) => {
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }))];
  const files = await imageFiles(id);
  return {
    images: files.map((_, index) => ({ src: `/dev/references/${encodeURIComponent(id)}/${index}`, label: `Gespeicherte Referenz ${index + 1}` })),
    links,
  };
}
