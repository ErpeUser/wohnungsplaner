import { notFound } from "next/navigation";
import { ModelReview } from "../../planner/review/model-review.tsx";
import { REVIEW_MODELS } from "../../planner/review/review-models.ts";
import { isReviewEnabled, readReviewReferences } from "../../planner/review/reference-files.ts";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  if (!isReviewEnabled()) notFound();
  const references = Object.fromEntries(await Promise.all(REVIEW_MODELS.map(async (model) => [model.id, await readReviewReferences(model.id)])));
  return <ModelReview references={references} />;
}
