/**
 * Single place for the public brand. Change the name, phone, domain and
 * service wording here or with the NEXT_PUBLIC_* variables in .env.example.
 * Do not scatter these strings through page copy.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "Emergency Freight Australia",
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT || "Emergency Freight",
  positioning:
    process.env.NEXT_PUBLIC_POSITIONING || "Australia's Emergency Delivery Service",
  headline: "Need It Delivered Now? We'll Get It Moving.",
  heroHeadline: "Urgent Delivery. No Time to Waste.",
  heroDescription:
    "From immediate Sydney pickups to interstate emergency freight, we coordinate dedicated transport for deliveries that cannot wait.",
  supporting:
    "Book urgent pickups, dedicated direct deliveries and interstate emergency freight online, 24/7. Get an indicative price, confirm your requirements and arrange the fastest suitable transport for your deadline.",
  phoneDisplay: process.env.NEXT_PUBLIC_PHONE_DISPLAY || "1300 000 000",
  phoneTel: process.env.NEXT_PUBLIC_PHONE_TEL || "+611300000000",
  email: process.env.NEXT_PUBLIC_DISPATCH_EMAIL || "dispatch@example.com",
  domain: process.env.NEXT_PUBLIC_DOMAIN || "emergencyfreight.com.au",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  abn: process.env.NEXT_PUBLIC_ABN || "",
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME || "Emergency Freight Australia",
  primaryCta: "Calculate Delivery Price",
  secondaryCta: "Arrange Emergency Pickup",
  serviceAreaNote:
    "Coverage on this website is limited to the routes and service types described. A request is not a confirmed booking.",
};

export function absoluteUrl(path: string) {
  const base = brand.url.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
