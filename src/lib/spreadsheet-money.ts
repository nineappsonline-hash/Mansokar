/** Parse common Egyptian spreadsheet money formats without guessing malformed values. */
export function spreadsheetEgp(
  value: string,
  row: number,
  field: string,
  optional = false,
): number | null {
  let text = value
    .normalize("NFKC")
    .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
    .replace(/٬/g, ",")
    .replace(/٫/g, ".")
    .replace(/،/g, ",")
    .trim();
  if (!text && optional) return null;
  const currency = "(?:EGP|L\\.E\\.?|LE|E£|ج\\.?\\s*م\\.?|جنيه(?:\\s+مصري)?)";
  // A label is accepted at either edge, never by deleting arbitrary letters.
  text = text
    .replace(new RegExp(`^${currency}\\s*`, "iu"), "")
    .replace(new RegExp(`\\s*${currency}$`, "iu"), "")
    .trim();
  if (/^\d{1,3}(?: \d{3})+(?:[.,]\d{1,2})?$/.test(text))
    text = text.replace(/ /g, "");
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(text))
    text = text.replace(/,/g, "");
  else if (/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(text))
    text = text.replace(/\./g, "").replace(",", ".");
  else if (/^\d+,\d{1,2}$/.test(text)) text = text.replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(text))
    throw Error(
      `Row ${row}: ${field} must be an EGP amount with at most two decimal places. Received ${JSON.stringify(value.slice(0, 80))}. Use 1250, 1,250 or ١٬٢٥٠${optional ? "; leave it blank if unknown" : ""}.`,
    );
  const [pounds, decimals = ""] = text.split(".");
  const amount = BigInt(pounds) * 100n + BigInt(decimals.padEnd(2, "0"));
  if (amount > BigInt(Number.MAX_SAFE_INTEGER))
    throw Error(`Row ${row}: ${field} is too large`);
  return Number(amount);
}
