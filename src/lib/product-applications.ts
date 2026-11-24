export type ProductApplication = { model_id: string; years: number[] };
export function readApplications(
  specs: Record<string, string> = {},
): ProductApplication[] {
  return Object.entries(specs)
    .filter(([key]) => key.startsWith("car_years:"))
    .map(([key, value]) => ({
      model_id: key.slice(10),
      years: value
        .split(",")
        .map(Number)
        .filter(
          (year) => Number.isInteger(year) && year >= 1950 && year <= 2100,
        ),
    }));
}
export function applicationSpecs(
  specs: Record<string, string>,
  applications: ProductApplication[],
) {
  return {
    ...Object.fromEntries(
      Object.entries(specs).filter(([key]) => !key.startsWith("car_years:")),
    ),
    ...Object.fromEntries(
      applications
        
        .map((a) => [
          `car_years:${a.model_id}`,
          [...new Set(a.years)].sort((a, b) => a - b).join(","),
        ]),
    ),
  };
}
