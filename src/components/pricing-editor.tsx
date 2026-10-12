"use client";

import { useMemo, useState } from "react";
import { previewRateCard } from "@/lib/pricing/engine";
import { formatAud } from "@/lib/money";
import type { PricingConfig } from "@/lib/pricing/types";

export function PricingEditor({ initial }: { initial: PricingConfig }) {
  const [config, setConfig] = useState(initial);
  const [message, setMessage] = useState("");
  const preview = useMemo(() => previewRateCard(config), [config]);

  function updateService(index: number, field: "baseFeeCents" | "perKmCents" | "minimumCents", dollars: string) {
    const services = config.services.map((service, serviceIndex) => serviceIndex === index ? { ...service, [field]: Math.round(Number(dollars) * 100) } : service);
    setConfig({ ...config, services });
  }

  async function save() {
    const response = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pricing", config }),
    });
    const body = await response.json();
    setMessage(response.ok ? "Rate card saved." : body.error || "Save failed.");
  }

  return (
    <div className="mt-6 grid gap-4 text-ink">
      <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={config.gstRegistered} onChange={(event) => setConfig({ ...config, gstRegistered: event.target.checked })} /> GST registered</label>
      <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={config.pricesIncludeGst} onChange={(event) => setConfig({ ...config, pricesIncludeGst: event.target.checked })} /> Rate card amounts already include GST</label>
      <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={config.autoAcceptEnabled} onChange={(event) => setConfig({ ...config, autoAcceptEnabled: event.target.checked })} /> Allow automatic acceptance when the environment switch is also on</label>
      {config.services.map((service, index) => (
        <fieldset key={service.code} className="rounded-2xl bg-white p-4">
          <legend className="font-semibold">{service.name}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <input className="field" aria-label={`${service.name} base`} defaultValue={(service.baseFeeCents / 100).toFixed(2)} onChange={(event) => updateService(index, "baseFeeCents", event.target.value)} />
            <input className="field" aria-label={`${service.name} per km`} defaultValue={(service.perKmCents / 100).toFixed(2)} onChange={(event) => updateService(index, "perKmCents", event.target.value)} />
            <input className="field" aria-label={`${service.name} minimum`} defaultValue={(service.minimumCents / 100).toFixed(2)} onChange={(event) => updateService(index, "minimumCents", event.target.value)} />
          </div>
        </fieldset>
      ))}
      <label className="grid gap-1 text-sm text-white">Minimum gross margin (percent)
        <input className="field" inputMode="decimal" defaultValue={String(config.minGrossMargin * 100)} onChange={(event) => setConfig({ ...config, minGrossMargin: Number(event.target.value) / 100 })} />
      </label>
      <label className="grid gap-1 text-sm text-white">Minimum gross profit (dollars)
        <input className="field" inputMode="decimal" defaultValue={(config.minGrossProfitCents / 100).toFixed(2)} onChange={(event) => setConfig({ ...config, minGrossProfitCents: Math.round(Number(event.target.value) * 100) })} />
      </label>
      <label className="grid gap-1 text-sm text-white">Carrier cost allowance (dollars, blank if unknown)
        <input className="field" inputMode="decimal" defaultValue={config.carrierAllowanceCents == null ? "" : (config.carrierAllowanceCents / 100).toFixed(2)} onChange={(event) => setConfig({ ...config, carrierAllowanceCents: event.target.value.trim() === "" ? null : Math.round(Number(event.target.value) * 100) })} />
      </label>
      <p className="text-sm text-white/70">Distance rounding: chargeable kilometres are the road distance rounded up to the next whole kilometre, with a floor of {config.minChargeableKm} km. The rows below are test estimates, not verified transport quotes.</p>
      <div className="overflow-x-auto rounded-2xl bg-white p-4 text-sm">
        <table className="w-full text-left">
          <thead>
            <tr><th className="py-1">Service</th><th>Km</th><th>Ex GST</th><th>Total</th></tr>
          </thead>
          <tbody>
            {preview.filter((row) => [10, 30, 50, 100, 200, 500, 1000].includes(row.kilometres)).map((row) => (
              <tr key={`${row.serviceCode}-${row.kilometres}`}>
                <td className="py-1">{row.serviceName}</td>
                <td>{row.kilometres}</td>
                <td>{row.calculated ? formatAud(row.exGstCents) : "Manual"}</td>
                <td>{row.calculated ? formatAud(row.totalCents) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn-orange" type="button" onClick={() => void save()}>Save rate card</button>
      {message && <p className="text-sm text-white">{message}</p>}
    </div>
  );
}
