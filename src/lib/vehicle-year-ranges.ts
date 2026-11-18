export function formatYearRanges(years: readonly number[]): string {
  const sorted = [...new Set(years.filter(Number.isInteger))].sort(
    (a, b) => a - b,
  );
  const ranges: string[] = [];
  for (let index = 0; index < sorted.length; index++) {
    const first = sorted[index];
    let last = first;
    while (sorted[index + 1] === last + 1) last = sorted[++index];
    ranges.push(first === last ? String(first) : `${first}–${last}`);
  }
  return ranges.join(", ");
}

type VehicleYear = { brand: string; model: string; year: number };

/** Group display entries only; preserve the source compatibility records. */
export function groupVehicleYears(vehicles: readonly VehicleYear[]) {
  const groups = new Map<
    string,
    { brand: string; model: string; years: number[] }
  >();
  for (const vehicle of vehicles) {
    if (!Number.isInteger(vehicle.year)) continue;
    const brand = vehicle.brand.trim();
    const model = vehicle.model.trim();
    const key = JSON.stringify([brand.toLowerCase(), model.toLowerCase()]);
    const group = groups.get(key);
    if (group) group.years.push(vehicle.year);
    else groups.set(key, { brand, model, years: [vehicle.year] });
  }
  return [...groups.values()].map((group) => ({
    ...group,
    years: formatYearRanges(group.years),
  }));
}
