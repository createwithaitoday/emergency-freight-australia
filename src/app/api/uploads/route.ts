import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDb } from "@/lib/db/client";
import { newId } from "@/lib/ids";
import { sameOrigin } from "@/lib/rate-limit";

const allowed = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Bad origin" }, { status: 403 });
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const db = await getDb();
  const rows = await db.query(`SELECT id FROM bookings WHERE tracking_token = $1`, [token]);
  if (!rows[0]) return Response.json({ error: "Booking not found" }, { status: 404 });
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  if (!files.length || files.length > 4) return Response.json({ error: "Attach between 1 and 4 files." }, { status: 400 });
  const dir = path.join(process.cwd(), "data", "uploads");
  await mkdir(dir, { recursive: true });
  for (const file of files) {
    const ext = allowed.get(file.type);
    if (!ext) return Response.json({ error: "Use a JPG, PNG, WEBP or PDF." }, { status: 400 });
    if (file.size > 5_000_000) return Response.json({ error: "Each file must be under 5 MB." }, { status: 400 });
    const stored = `${newId()}.${ext}`;
    await writeFile(path.join(dir, stored), Buffer.from(await file.arrayBuffer()));
    await db.query(
      `INSERT INTO stored_files (id, booking_id, kind, stored_name, original_name) VALUES ($1,$2,'freight',$3,$4)`,
      [newId(), rows[0].id, stored, file.name.slice(0, 120)],
    );
  }
  return Response.json({ ok: true });
}
