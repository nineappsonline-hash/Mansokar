import type { Locale } from "@/lib/catalog";

/** Keep Latin brands and part numbers in reading order within Arabic sentences. */
export function ProductText({
  text,
  locale,
}: {
  text: string;
  locale: Locale;
}) {
  if (locale !== "ar") return <>{text}</>;
  return (
    <>
      {text
        .split(/([A-Za-z][A-Za-z0-9]*(?:[ ./_-][A-Za-z0-9]+)*)/g)
        .map((part, index) =>
          index % 2 ? (
            <bdi dir="ltr" key={index}>
              {part}
            </bdi>
          ) : (
            part
          ),
        )}
    </>
  );
}
