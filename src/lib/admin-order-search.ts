/** Restrict user input before embedding it into a PostgREST OR filter. */
export function orderSearchTerm(input: string | undefined): { term: string; valid: boolean } {
  const term = (input ?? "").trim().slice(0, 80);
  // PostgREST OR grammar uses commas, parentheses, quotes and wildcard symbols.
  // Permit ordinary Arabic/Latin text, numbers, whitespace and safe ID punctuation.
  const valid = /^[\p{L}\p{N}\s+#/-]*$/u.test(term);
  return { term, valid };
}
