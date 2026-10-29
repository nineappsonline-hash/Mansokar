export const emptyImportMessage =
  "No product rows found. In Excel, fill the Products worksheet below the header, save the file, then select it again. The Examples sheet is a guide and is not imported.";

export function importFeedback(data: {
  errors?: { row?: number | null; field?: string; message?: string }[];
  error?: string;
}) {
  if (data.errors?.length)
    return data.errors
      .map((issue) => {
        const row =
          typeof issue.row === "number" && Number.isFinite(issue.row)
            ? `Item ${issue.row}`
            : "File";
        return `${row}${issue.field && issue.field !== "file" ? ` · ${issue.field}` : ""}: ${issue.message || "Invalid value"}`;
      })
      .join("\n");
  return data.error || "Unable to check this file. Please select it again.";
}
