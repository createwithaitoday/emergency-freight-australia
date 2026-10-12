import { getDb } from "@/lib/db/client";

export async function GET() {
  try {
    const db = await getDb();
    await db.query("SELECT 1 AS ok");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
