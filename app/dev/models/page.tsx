import { notFound } from "next/navigation";
import { ModelReview } from "../../planner/review/model-review.tsx";
import { REVIEW_MODELS, type ReviewView } from "../../planner/review/review-models.ts";
import { isReviewEnabled, readReviewReferences } from "../../planner/review/reference-files.ts";

export const dynamic = "force-dynamic";

export default async function ModelsPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  if (!isReviewEnabled()) notFound();
  const query = await searchParams ?? {};
  const initialModelId = REVIEW_MODELS.find((model) => model.id === query.model)?.id ?? "chair-kaleo-chenille-beige";
  const views: readonly ReviewView[] = ["front", "side", "back", "perspective"];
  const initialView = views.find((view) => view === query.view) ?? "perspective";
  const references = Object.fromEntries(await Promise.all(REVIEW_MODELS.map(async (model) => [model.id, await readReviewReferences(model.id)])));
  return <ModelReview key={`${initialModelId}:${initialView}`} references={references} initialModelId={initialModelId} initialView={initialView} />;
}
