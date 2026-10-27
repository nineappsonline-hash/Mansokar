import { importRows } from "./validation";
export function validateImport(rows: unknown) {
  const result = importRows.safeParse(rows);
  return result.success
    ? { valid: true as const, rows: result.data, errors: [] }
    : {
        valid: false as const,
        rows: [],
        errors: result.error.issues.map((i) => ({
          row: Number(i.path[0]) + 1,
          field: i.path.slice(1).join("."),
          message: i.message,
        })),
      };
}
export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return (
    '"' +
    (/^(\s*[=+@-]|[\t\r])/.test(text) ? "'" + text : text).replaceAll(
      '"',
      '""',
    ) +
    '"'
  );
}
