import { emptyImportMessage } from "./import-feedback";
import { importRows } from "./validation";
export function validateImport(rows: unknown) {
  const result = importRows.safeParse(rows);
  return result.success
    ? { valid: true as const, rows: result.data, errors: [] }
    : {
        valid: false as const,
        rows: [],
        errors: result.error.issues.map((i) => ({
          row: typeof i.path[0] === "number" ? i.path[0] + 1 : null,
          field: i.path.length ? i.path.slice(1).join(".") : "file",
          message:
            Array.isArray(rows) && !rows.length
              ? emptyImportMessage
              : i.message,
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
