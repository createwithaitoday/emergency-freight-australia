import type { Metadata } from "next";
import { DeliveryCalculator } from "@/components/delivery-calculator";

export const metadata: Metadata = {
  title: "Calculate a delivery price",
  description: "Enter a pickup, a delivery and the freight. See an indicative price, then lodge the request for confirmation.",
  alternates: { canonical: "/book" },
};

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl">Calculate delivery price</h1>
      <p className="mt-2 text-muted">The figure updates as you enter the route. It stays indicative until dispatch confirms it, unless the rate card says the job can be accepted automatically.</p>
      <div className="mt-6">
        <DeliveryCalculator
          preset={{
            pickupAddress: params.pickupAddress ?? "",
            pickupSuburb: params.pickupSuburb ?? "",
            pickupPostcode: params.pickupPostcode ?? "",
            deliveryAddress: params.deliveryAddress ?? "",
            deliverySuburb: params.deliverySuburb ?? "",
            deliveryPostcode: params.deliveryPostcode ?? "",
          }}
        />
      </div>
    </div>
  );
}
