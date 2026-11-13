import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modelRoot = path.join(root, "models");
const imageExtensions = new Set([".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"]);
const tempPathPattern = /[A-Za-z]:[\\/][^"'\r\n]*[\\/](?:temp|tmp)[\\/]browser-use(?:[\\/]|$)[^"'\r\n]*/gi;
const imageMagic = [
  (bytes) => bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  (bytes) => bytes.subarray(0, 6).toString("ascii") === "GIF87a" || bytes.subarray(0, 6).toString("ascii") === "GIF89a",
  (bytes) => bytes.subarray(0, 2).toString("ascii") === "BM",
  (bytes) => bytes.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00])) || bytes.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a])),
  (bytes) => bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP",
  (bytes) => bytes.subarray(4, 12).toString("ascii") === "ftypavif" || bytes.subarray(4, 12).toString("ascii") === "ftypavis",
];

function normalizeText(value) {
  return value.replace(/\\\\/g, "/").replace(/\\\//g, "/");
}

function looksLikeTextOrJavaScript(bytes) {
  if (!bytes.length) return false;
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  if (sample.includes(0)) return false;
  const text = sample.toString("utf8");
  const printable = [...text].filter((character) => character === "\n" || character === "\r" || character === "\t" || character >= " ").length;
  if (printable / Math.max(text.length, 1) < 0.9) return false;
  return /^(?:\/\*!|\/\/|\s*(?:["']use strict["'];?|(?:const|let|var|function|class|import|export)\b|[!(]?\s*function\b|\(\s*function\b|<script\b))/i.test(text);
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

let files;
try {
  files = await walk(modelRoot);
} catch (error) {
  console.error("Referenz-Exports konnten nicht gelesen werden: " + error.message);
  process.exitCode = 1;
  process.exit();
}

const referenceFiles = files.filter((filePath) => filePath.split(path.sep).includes("Auszug"));
const errors = [];

for (const filePath of referenceFiles) {
  const relativePath = path.relative(root, filePath);
  let bytes;
  try {
    bytes = await fs.readFile(filePath);
  } catch (error) {
    errors.push(relativePath + ": Datei konnte nicht gelesen werden (" + error.message + ")");
    continue;
  }

  const text = normalizeText(bytes.toString("utf8"));
  if (tempPathPattern.test(text)) {
    errors.push(relativePath + ": absoluter browser-use-Temp-Pfad ist enthalten");
  }
  tempPathPattern.lastIndex = 0;

  const extension = path.extname(filePath).toLowerCase();
  const inImageFolder = filePath.split(path.sep).includes("Bilder");
  if (!inImageFolder || !imageExtensions.has(extension)) continue;

  if (!imageMagic.some((check) => check(bytes))) {
    const kind = looksLikeTextOrJavaScript(bytes) ? "textartiges JavaScript-/Bundle-Dokument" : "unbekannte oder fehlende Bild-Magic-Bytes";
    errors.push(relativePath + ": Bilddatei enthält " + kind);
  }
}

if (errors.length) {
  console.error("Referenz-Exports geprüft: " + referenceFiles.length + " Dateien, " + errors.length + " Fehler.");
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Referenz-Exports geprüft: " + referenceFiles.length + " Dateien ohne Temp-Pfade oder ungültige Bilddateien.");
}
