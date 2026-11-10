import Link from "next/link";
type PageItem = number | "ellipsis";
function pageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total]);
  for (
    let page = Math.max(2, current - 1);
    page <= Math.min(total - 1, current + 1);
    page++
  )
    pages.add(page);
  if (current <= 4) for (let page = 2; page <= 5; page++) pages.add(page);
  if (current >= total - 3)
    for (let page = total - 4; page < total; page++) pages.add(page);
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap<PageItem>((page, index) =>
    index && page - sorted[index - 1] > 1 ? ["ellipsis", page] : [page],
  );
}
export function Pagination({
  page,
  total,
  pageSize = 12,
  hrefFor,
  locale,
}: {
  page: number;
  total: number;
  pageSize?: number;
  hrefFor: (page: number) => string;
  locale: "ar" | "en";
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const current = Math.min(Math.max(1, page), pages);
  const previous = locale === "ar" ? "السابق" : "Previous";
  const next = locale === "ar" ? "التالي" : "Next";
  const label = locale === "ar" ? "تصفح الصفحات" : "Pagination";
  const pageLabel = (value: number) =>
    locale === "ar" ? `الصفحة ${value}` : `Page ${value}`;
  const previousIcon = locale === "ar" ? "›" : "‹";
  const nextIcon = locale === "ar" ? "‹" : "›";
  const step = (direction: "previous" | "next", target: number) => {
    const content = (
      <>
        <span className="pagination-step-text">
          {direction === "previous" ? previous : next}
        </span>
        <span className="pagination-step-icon" aria-hidden="true">
          {direction === "previous" ? previousIcon : nextIcon}
        </span>
      </>
    );
    const enabled =
      (direction === "previous" && target >= 1) ||
      (direction === "next" && target <= pages);
    return enabled ? (
      <Link
        className="pagination-step"
        href={hrefFor(target)}
        rel={direction === "previous" ? "prev" : "next"}
        aria-label={direction === "previous" ? previous : next}
      >
        {content}
      </Link>
    ) : (
      <span className="pagination-step" aria-disabled="true">
        {content}
      </span>
    );
  };
  return (
    <nav className="pagination" aria-label={label}>
      {step("previous", current - 1)}
      {pageItems(current, pages).map((item, index) =>
        item === "ellipsis" ? (
          <span className="pagination-ellipsis" key={`ellipsis-${index}`}>
            …
          </span>
        ) : (
          <Link
            className="pagination-page"
            key={item}
            href={hrefFor(item)}
            aria-label={pageLabel(item)}
            aria-current={item === current ? "page" : undefined}
          >
            {item}
          </Link>
        ),
      )}
      {step("next", current + 1)}
    </nav>
  );
}
