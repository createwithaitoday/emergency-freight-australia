import { PricingEditor } from "@/components/pricing-editor";
import { getStoredPricing } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

export default async function PricingAdminPage() {
  const config = await getStoredPricing();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Rate card</h1>
      <p className="mt-2 text-sm text-white/70">Automatic acceptance also requires PRICING_AUTO_ACCEPT=true in the server environment. Leaving that unset keeps every customer price indicative.</p>
      <PricingEditor initial={config} />
    </div>
  );
}
