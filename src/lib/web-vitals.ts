import { z } from "zod";

/** Only coarse, non-identifying fields may be transmitted from the browser. */
export const vitalMetrics = ["LCP", "INP", "CLS", "TTFB", "FCP"] as const;
export const webVitalInput = z.object({
  name: z.enum(vitalMetrics),
  value: z.number().finite().min(0).max(600000),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  page: z.enum(["home", "catalog", "product", "brand", "model", "checkout", "other"]),
  device: z.enum(["mobile", "desktop"]),
  locale: z.enum(["ar", "en"]),
}).strict();

export function metricValue(name: string, value: number): number {
  // CLS is unitless, while other Web Vitals values are in milliseconds.
  return Math.round(value * (name === "CLS" ? 1000 : 1)) / (name === "CLS" ? 1000 : 1);
}
