"use client";
import { useState } from "react";
import Link from "next/link";
import type { SeoHealthRow } from "@/lib/seo-health";
export function AdminSeoDashboard({ rows }: { rows: SeoHealthRow[] }) {
  const [q, setQ] = useState(""),
    [issue, setIssue] = useState(""),
    [page, setPage] = useState(1);
  const filtered = rows.filter(
    (r) =>
      (r.name + " " + r.sku).toLowerCase().includes(q.toLowerCase()) &&
      (!issue || r.issues.includes(issue)),
  );
  const issues = [...new Set(rows.flatMap((r) => r.issues))].sort();
  return (
    <section className="panel stack">
      <h2>Product SEO remediation</h2>
      <p>
        The score measures data completeness, not search ranking. Unknown
        inventory or condition is never guessed.
      </p>
      <div className="filters">
        <label>
          Find product or SKU
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Issue
          <select
            value={issue}
            onChange={(e) => {
              setIssue(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All products</option>
            {issues.map((v) => (
              <option key={v} value={v}>
                {v.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <a className="button secondary" href="/api/admin-seo-report">
          Export SEO audit CSV
        </a>
      </div>
      <p>
        {filtered.length} matching products ·{" "}
        {rows.filter((r) => r.eligibleAr).length} Arabic-eligible ·{" "}
        {rows.filter((r) => r.eligibleEn).length} English-eligible
      </p>
      {filtered.slice((page - 1) * 25, page * 25).map((r) => (
        <article key={r.id} className="panel stack">
          <h3>
            <Link href={`/admin?module=products&id=${r.id}`}>
              {r.sku} · {r.name}
            </Link>
          </h3>
          <p>
            {r.score}/100 completeness · {r.status} · {r.photoCount} photos ·
            Last content update: {r.updatedAt || "unknown for legacy records"}
          </p>
          <p>
            {r.issues.map((v) => v.replaceAll("_", " ")).join(" · ") ||
              "No detected data gaps"}
          </p>
          <details>
            <summary>Canonical and search preview</summary>
            <p dir="rtl" lang="ar">
              {r.title}
            </p>
            <p dir="rtl" lang="ar">
              {r.description}
            </p>
            <p style={{ overflowWrap: "anywhere" }}>{r.canonical}</p>
            <p>
              Locale eligibility: Arabic {r.eligibleAr ? "yes" : "no"} · English{" "}
              {r.eligibleEn ? "yes" : "no"}. Final indexability also depends on
              launch approval and public host configuration.
            </p>
          </details>
          <div className="admin-nav">
            <Link href={`/admin?module=products&id=${r.id}&tab=photos`}>
              Photos
            </Link>
            <Link href={`/admin?module=products&id=${r.id}&tab=vehicles`}>
              Cars & years
            </Link>
            <Link href={`/admin?module=products&id=${r.id}`}>
              Details & optional SEO overrides
            </Link>
          </div>
        </article>
      ))}
      <div className="admin-nav">
        <button
          className="button secondary"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} / {Math.max(1, Math.ceil(filtered.length / 25))}
        </span>
        <button
          className="button secondary"
          disabled={page * 25 >= filtered.length}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
