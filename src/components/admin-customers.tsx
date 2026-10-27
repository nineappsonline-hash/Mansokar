import Link from "next/link";
import { service } from "@/lib/db";
import { money } from "@/lib/catalog";
import { ApiForm } from "./forms";
export async function AdminCustomers({
  actor,
  id,
  q = "",
  page = "1",
}: {
  actor: string;
  id?: string;
  q?: string;
  page?: string;
}) {
  const db = service();
  const offset = (Math.max(1, Math.min(10000, Number(page) || 1)) - 1) * 50;
  const { data, error } = await db.rpc("admin_customer_accounts", {
    p_actor: actor,
    p_query: q.trim().slice(0, 100),
    p_page: offset / 50 + 1,
  });
  if (error) throw error;
  const members = data.members as {
    user_id: string;
    email: string;
    verified: boolean;
    name: string | null;
    phone: string | null;
    locale: string | null;
  }[];
  const count = data.total as number;
  let detail: React.ReactNode = null;
  if (
    id &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
  ) {
    const [
      { data: profile },
      { data: account },
      { data: orders },
      { data: requests },
      { data: notes },
    ] = await Promise.all([
      db
        .from("profiles")
        .select("name,phone,locale")
        .eq("user_id", id)
        .maybeSingle(),
      db.auth.admin.getUserById(id),
      db
        .from("orders")
        .select("id,order_number,status,total,created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("part_requests")
        .select("id,description,status,quoted_amount")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("customer_notes")
        .select("id,body,created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (account.user)
      detail = (
        <section className="panel stack">
          <h2>{profile?.name || account.user.email || "Member"}</h2>
          <p>
            {account.user.email} · {profile?.phone} · {profile?.locale}
          </p>
          <p>
            {account.user.email_confirmed_at
              ? "Email verified"
              : "Email not verified"}
          </p>
          <details>
            <summary>Edit customer profile</summary>
            <ApiForm
              action="admin-customer-profile"
              extra={{ user_id: id }}
              label="Save customer profile"
            >
              <label>
                Name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  defaultValue={profile?.name ?? ""}
                />
              </label>
              <label>
                Egyptian mobile
                <input
                  name="phone"
                  required
                  pattern="01[0125][0-9]{8}"
                  defaultValue={profile?.phone ?? ""}
                />
              </label>
              <label>
                Preferred language
                <select name="locale" defaultValue={profile?.locale ?? "ar"}>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </label>
            </ApiForm>
          </details>
          <h3>Recent orders (up to 100)</h3>
          {orders?.map((o) => (
            <Link key={o.id} href={"/admin?module=orders&id=" + o.id}>
              {o.order_number} · {o.status} · {money(o.total, "en")}
            </Link>
          ))}
          <h3>Recent inquiries (up to 100)</h3>
          {requests?.map((r) => (
            <article key={r.id}>
              <p>{r.description}</p>
              <p>
                {r.status}
                {r.quoted_amount !== null
                  ? " · " + money(r.quoted_amount, "en")
                  : ""}
              </p>
              <Link href={"/admin?module=inquiries&id=" + r.id}>
                Manage inquiry
              </Link>
            </article>
          ))}
          <h3>Private support notes</h3>
          <p className="muted">
            Visible to enabled administrators only. Never place passwords or
            payment credentials in notes.
          </p>
          {notes?.map((n) => (
            <article key={n.id} className="accordion">
              <time>
                {new Date(n.created_at)
                  .toISOString()
                  .slice(0, 16)
                  .replace("T", " ")}{" "}
                UTC
              </time>
              <p className="prose">{n.body}</p>
            </article>
          ))}
          <ApiForm
            action="admin-customer-note"
            extra={{ user_id: id }}
            label="Add support note"
          >
            <label>
              Note
              <textarea name="body" required minLength={1} maxLength={3000} />
            </label>
          </ApiForm>
        </section>
      );
  }
  return (
    <div className="stack">
      <form className="panel filters">
        <input type="hidden" name="module" value="customers" />
        <label>
          Find account by email, name or phone
          <input name="q" maxLength={100} defaultValue={q} />
        </label>
        <button className="button">Search</button>
      </form>
      <p className="muted">
        All registered accounts are included, even without a saved profile.
        Guest contacts are available in Orders and Inquiries. {count ?? 0}{" "}
        matching accounts.
      </p>
      <div className="two-col">
        <div className="panel stack">
          {members?.map((m) => (
            <Link
              key={m.user_id}
              href={`/admin?module=customers&id=${m.user_id}&q=${encodeURIComponent(q)}`}
            >
              {m.name || m.email} · {m.email} · {m.phone || "No phone supplied"}
            </Link>
          ))}
          {!members?.length && <p>No matching profiles.</p>}
          <div className="admin-nav">
            {offset > 0 && (
              <Link
                href={`/admin?module=customers&q=${encodeURIComponent(q)}&page=${offset / 50}`}
              >
                Previous
              </Link>
            )}
            {offset + 50 < (count ?? 0) && (
              <Link
                href={`/admin?module=customers&q=${encodeURIComponent(q)}&page=${offset / 50 + 2}`}
              >
                Next
              </Link>
            )}
          </div>
        </div>
        {detail}
      </div>
    </div>
  );
}
