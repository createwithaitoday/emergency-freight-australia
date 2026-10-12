import { listTemplates } from "@/lib/db/repo";
import { TemplateEditor } from "@/components/template-editor";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await listTemplates();
  return (
    <div>
      <h1 className="font-display text-3xl">Message templates</h1>
      <p className="mt-2 max-w-2xl text-sm text-white/70">A driver-allocated or delivered message is sent only after that status is stored. Editing the words does not send them.</p>
      <div className="mt-6 grid gap-4">
        {templates.map((template) => (
          <TemplateEditor key={`${template.code}-${template.channel}`} template={{ code: String(template.code), channel: String(template.channel), subject: String(template.subject ?? ""), body: String(template.body) }} />
        ))}
      </div>
    </div>
  );
}
