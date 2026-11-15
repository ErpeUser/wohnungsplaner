import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readReviewImage, readReviewReferences } from "../app/planner/review/reference-files.ts";

const originalDirectory = process.cwd();
const originalReviewSetting = process.env.PLANNER_REVIEW_ENABLED;
const originalNodeEnv = process.env.NODE_ENV;
const environment = process.env as Record<string, string | undefined>;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6J8sAAAAASUVORK5CYII=", "base64");
let directory: string;

async function fixture(relative: string, content: string | Buffer) {
  const target = path.join(directory, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "planner-review-references-"));
  process.chdir(directory);
  process.env.PLANNER_REVIEW_ENABLED = "1";
});

afterEach(async () => {
  process.chdir(originalDirectory);
  if (originalReviewSetting === undefined) delete process.env.PLANNER_REVIEW_ENABLED;
  else process.env.PLANNER_REVIEW_ENABLED = originalReviewSetting;
  if (originalNodeEnv === undefined) delete environment.NODE_ENV;
  else environment.NODE_ENV = originalNodeEnv;
  await rm(directory, { recursive: true, force: true });
});

test("canonical table review includes saved alias images and sources", async () => {
  await fixture("models/products/dining-table-aliexpress-100-140/link.txt", "https://example.com/original\n");
  await fixture("models/products/aliexpress-100-140/link.txt", "https://example.com/original\nhttps://example.com/mirror\n");
  await fixture("models/products/aliexpress-100-140/references/product.png", png);
  const references = await readReviewReferences("dining-table-aliexpress-100-140");
  assert.equal(references.images.length, 1);
  assert.deepEqual(references.links, ["https://example.com/original", "https://example.com/mirror"]);
  const image = await readReviewImage("dining-table-aliexpress-100-140", 0);
  assert.equal(image?.type, "image/png");
  assert.deepEqual(image?.bytes, png);
});

test("review combines canonical excerpts and alias references in stable order", async () => {
  await fixture("models/products/dining-table-temu-606997-120-160/Auszug/Bilder/detail.png", png);
  await fixture("models/products/temu-606997-120-160/references/product.png", png);
  const references = await readReviewReferences("dining-table-temu-606997-120-160");
  assert.equal(references.images.length, 2);
  assert.deepEqual(references.images.map((image) => image.src), [
    "/dev/references/dining-table-temu-606997-120-160/0",
    "/dev/references/dining-table-temu-606997-120-160/1",
  ]);
});

test("alias review rejects unregistered ids and reference symlinks outside models", async () => {
  await fixture("outside/private.png", png);
  await mkdir(path.join(directory, "models/products/aliexpress-100-140"), { recursive: true });
  await symlink(path.join(directory, "outside"), path.join(directory, "models/products/aliexpress-100-140/references"), "dir");
  assert.deepEqual(await readReviewReferences("dining-table-aliexpress-100-140"), { images: [], links: [] });
  assert.deepEqual(await readReviewReferences("../../outside"), { images: [], links: [] });
  assert.equal(await readReviewImage("aliexpress-100-140", 0), null);
  assert.deepEqual(await readFile(path.join(directory, "outside/private.png")), png);
});

test("production keeps alias images and links behind the existing review gate", async () => {
  await fixture("models/products/aliexpress-100-140/references/product.png", png);
  environment.NODE_ENV = "production";
  process.env.PLANNER_REVIEW_ENABLED = "0";
  assert.deepEqual(await readReviewReferences("dining-table-aliexpress-100-140"), { images: [], links: [] });
  assert.equal(await readReviewImage("dining-table-aliexpress-100-140", 0), null);
});

test("a retained alias cannot redirect review into a private sibling inside models", async () => {
  await fixture("models/private-flat/references/private.png", png);
  await fixture("models/private-flat/link.txt", "https://private.example.invalid/reference\n");
  await mkdir(path.join(directory, "models/products"), { recursive: true });
  await symlink(path.join(directory, "models/private-flat"), path.join(directory, "models/products/aliexpress-100-140"), "dir");
  assert.deepEqual(await readReviewReferences("dining-table-aliexpress-100-140"), { images: [], links: [] });
  assert.equal(await readReviewImage("dining-table-aliexpress-100-140", 0), null);
});
