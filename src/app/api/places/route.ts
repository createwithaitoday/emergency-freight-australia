import { searchPlaces } from "@/lib/geo/places";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  if (!rateLimit(`places:${clientKey(request)}`, 60, 60_000)) {
    return Response.json({ places: [] }, { status: 429 });
  }
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ places: searchPlaces(query) });
}
