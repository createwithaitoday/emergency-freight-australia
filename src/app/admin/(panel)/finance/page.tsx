import { financeRows, getStoredPricing } from "@/lib/db/repo";
import { formatAud } from "@/lib/money";
import { grossProfitCents, marginPercent } from "@/lib/pricing/engine";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const [rows, pricing] = await Promise.all([financeRows(), getStoredPricing()]);
  const recognised = rows.filter((row) => row.payment_status === "paid" || row.payment_status === "on_account" || row.payment_status === "partially_refunded");
  const revenue = recognised.reduce((sum, row) => sum + Number(row.selling_net_cents), 0);
  const cost = recognised.reduce((sum, row) => sum + Number(row.carrier_cost_cents ?? 0), 0);
  const fees = recognised.reduce((sum, row) => sum + Number(row.payment_fee_cents ?? 0), 0);
  const profit = grossProfitCents(revenue, cost, fees);
  return (
    <div>
      <h1 className="font-display text-3xl">Finance</h1>
      <p className="mt-2 max-w-3xl text-sm text-white/70">Gross profit is ex-GST revenue minus direct delivery cost and payment fees. Fixed overheads ({formatAud(pricing.monthlyOverheadCents)} configured) are not allocated to jobs. Acquisition cost is listed only when a booking has one.</p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 text-ink"><dt className="text-sm">Ex-GST revenue</dt><dd className="font-display text-3xl">{formatAud(revenue)}</dd></div>
        <div className="rounded-2xl bg-white p-4 text-ink"><dt className="text-sm">Direct cost</dt><dd className="font-display text-3xl">{formatAud(cost)}</dd></div>
        <div className="rounded-2xl bg-white p-4 text-ink"><dt className="text-sm">Gross profit</dt><dd className="font-display text-3xl">{formatAud(profit)}{marginPercent(revenue, profit) == null ? "" : ` · ${marginPercent(revenue, profit)?.toFixed(1)}%`}</dd></div>
      </dl>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="text-white/60"><th className="py-2">Job</th><th>Route</th><th>Service</th><th>Net</th><th>Cost</th><th>Profit</th></tr></thead>
          <tbody>
            {rows.map((row) => {
              const jobProfit = row.carrier_cost_cents == null ? null : grossProfitCents(Number(row.selling_net_cents), Number(row.carrier_cost_cents), Number(row.payment_fee_cents));
              return (
                <tr key={String(row.id)} className="border-t border-white/10">
                  <td className="py-2">{String(row.public_number)}</td>
                  <td>{String(row.pickup_postcode)}–{String(row.delivery_postcode)}</td>
                  <td>{String(row.service_code)}</td>
                  <td>{formatAud(Number(row.selling_net_cents))}</td>
                  <td>{row.carrier_cost_cents == null ? "—" : formatAud(Number(row.carrier_cost_cents))}</td>
                  <td>{jobProfit == null ? "—" : formatAud(jobProfit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
