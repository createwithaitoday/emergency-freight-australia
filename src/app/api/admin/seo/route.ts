import { currentAdmin } from "@/lib/auth";
import { ensureSeoInventory, importKeywords, reviewCandidates } from "@/lib/seo/inventory";
import { sameOrigin } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  const admin = await currentAdmin();
  if (!admin) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";
  try {
    if (action === "generate") {
      const result = await ensureSeoInventory(admin.email);
      return Response.json({
        message: `Locations ${result.locationCount}. Candidates ${result.candidates}. Published ${result.published}. Awaiting review ${result.awaitingReview}. Needs improvement ${result.needsImprovement}.`,
        result,
      });
    }
    if (action === "keywords") {
      const csv = typeof body?.csv === "string" ? body.csv : "";
      const imported = await importKeywords(admin.email, csv);
      return Response.json({ message: `Imported ${imported} keyword rows. Blank volumes stay labelled Demand not yet verified.` });
    }
    if (action === "review") {
      const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
      const review = body?.review;
      if (!["approve", "reject", "noindex", "archive"].includes(review)) return Response.json({ error: "Unknown review action." }, { status: 400 });
      const changed = await reviewCandidates(admin.email, ids, review);
      return Response.json({ message: `${changed} pages updated. Approval still requires a passing quality gate.` });
    }
    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SEO action failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
