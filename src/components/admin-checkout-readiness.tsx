import Link from "next/link";
import { service } from "@/lib/db";
export async function AdminCheckoutReadiness() {
  const db = service();
  const required = [
    { slug: "policies/terms", name: "Terms & conditions" },
    { slug: "policies/privacy", name: "Privacy policy" },
    { slug: "policies/returns", name: "Returns policy" },
  ];
  const { data, error } = await db
    .from("cms_pages")
    .select("slug,published")
    .in(
      "slug",
      required.map((p) => p.slug),
    );
  if (error) throw error;
  const missing = required.filter(
    (p) => !data.some((row) => row.slug === p.slug && row.published),
  );
  return (
    <section
      className={`panel stack ${missing.length ? "checkout-readiness-warning" : "checkout-readiness-ready"}`}
      aria-label="Checkout readiness"
    >
      <h2>
        {missing.length
          ? "Checkout is blocked by unpublished policies"
          : "Checkout policies are published"}
      </h2>
      <p>
        {missing.length
          ? "Checkout stops before contacting any payment provider until all three required policies are published. Review the content below and publish it when approved."
          : "Terms, Privacy and Returns are published. Customers can proceed to the configured payment methods."}
      </p>
      <div className="readiness-policies">
        {required.map((p) => {
          const record = data.find((row) => row.slug === p.slug);
          return (
            <Link
              key={p.slug}
              href={`/admin?module=cms&id=${encodeURIComponent(p.slug)}`}
            >
              <strong>{p.name}</strong>
              <span>
                {record?.published
                  ? "Published"
                  : record
                    ? "Draft — review & publish"
                    : "Missing — create page"}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
