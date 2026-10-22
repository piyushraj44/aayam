import type { MetadataRoute } from "next";
import { navItems, site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/+$/, "");
  return navItems.map((item) => ({
    url: item.href === "/" ? `${base}/` : `${base}${item.href}`,
    changeFrequency: item.ready ? "weekly" : "monthly",
    priority: item.href === "/" ? 1 : 0.6,
  }));
}
