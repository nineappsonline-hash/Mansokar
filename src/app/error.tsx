"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell section">
      <h1>تعذر تحميل الصفحة / Unable to load this page</h1>
      <p>حاول مجدداً / Please try again.</p>
      <button className="button" onClick={reset}>
        إعادة المحاولة / Retry
      </button>
    </main>
  );
}
