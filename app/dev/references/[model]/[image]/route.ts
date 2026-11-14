import { readReviewImage } from "../../../../planner/review/reference-files.ts";

export async function GET(_request: Request, context: { params: Promise<{ model: string; image: string }> }) {
  const { model, image } = await context.params;
  if (!/^\d+$/.test(image)) return new Response(null, { status: 404 });
  const result = await readReviewImage(model, Number(image));
  if (!result) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(result.bytes), {
    headers: { "Content-Type": result.type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" },
  });
}
