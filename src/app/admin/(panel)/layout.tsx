import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <header className="flex flex-wrap items-center gap-4 border-b border-white/10 px-4 py-3">
        <Link href="/admin" className="font-display text-lg">Dispatch</Link>
        <nav className="flex flex-wrap gap-4 text-sm text-white/70">
          <Link href="/admin">Board</Link>
          <Link href="/admin/pricing">Pricing</Link>
          <Link href="/admin/finance">Finance</Link>
          <Link href="/admin/templates">Templates</Link>
          <Link href="/admin/audit">Audit</Link>
          <Link href="/">Website</Link>
        </nav>
        <form action="/api/admin/logout" method="post" className="ml-auto">
          <button className="text-sm text-white/70" type="submit">{admin.email} · sign out</button>
        </form>
      </header>
      <div className="px-4 py-6">{children}</div>
    </div>
  );
}
