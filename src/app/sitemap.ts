import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { legalPages, locations, services } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/book", "/services", "/locations", "/pricing", "/faq", "/industries", "/track", "/account",
    ...services.map((service) => `/services/${service.slug}`),
    ...locations.map((location) => `/locations/${location.slug}`),
    ...legalPages.map((page) => `/legal/${page.slug}`),
  ];
  return paths.map((path) => ({ url: `${brand.url.replace(/\/$/, "")}${path || "/"}`, changeFrequency: "weekly", priority: path === "" ? 1 : 0.7 }));
}
