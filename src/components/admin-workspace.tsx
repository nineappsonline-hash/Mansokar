"use client";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Image,
  Layers,
  Megaphone,
  Users,
  Tags,
  Car,
  ShoppingBag,
  MessageSquare,
  Truck,
  Ticket,
  FileText,
  Upload,
  BarChart3,
  Search,
  Settings,
  Palette,
  GalleryHorizontalEnd,
  Link2,
  ArrowUpRight,
  Plus,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { ApiForm } from "./forms";
import styles from "./admin-workspace.module.css";
const navigation: { title: string; items: [string, string, LucideIcon][] }[] = [
  {
    title: "Workspace",
    items: [
      ["overview", "Overview", LayoutDashboard],
      ["orders", "Orders", ShoppingBag],
      ["inquiries", "Inquiries", MessageSquare],
      ["customers", "Customers", Users],
    ],
  },
  {
    title: "Catalog",
    items: [
      ["products", "Products", Package],
      ["vehicles", "Vehicles", Car],
      ["recommendations", "Recommendations", Layers],
    ],
  },
  {
    title: "Storefront",
    items: [
      ["campaigns", "Campaigns", Megaphone],
      ["promotions", "Promotions", Ticket],
      ["shipping", "Shipping", Truck],
      ["cms", "Pages & policies", FileText],
      ["branding", "Branding", Palette],
      ["hero-slideshow", "Hero slideshow", GalleryHorizontalEnd],
    ],
  },
  {
    title: "Insights & settings",
    items: [
      ["reports", "Sales reports", BarChart3],
      ["analytics", "Analytics", BarChart3],
      ["seo", "SEO & discovery", Search],
      ["settings", "Settings", Settings],
    ],
  },
];
const descriptions: Record<string, string> = {
  overview: "A clear view of your store’s performance and everyday operations.",
  products: "Manage your parts, prices and vehicle coverage in one place.",
  orders: "Review purchases and keep fulfillment moving.",
  inquiries: "Follow up on customer questions and part requests.",
  shipping: "Set delivery options and rates for every governorate.",
  vehicles: "Keep your vehicle makes, models and configurations up to date.",
  seo: "Review search visibility and improve your product content.",
};
export function AdminSignIn({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={`${styles.workspace} ${styles.signIn}`}
      lang="en"
      dir="ltr"
    >
      <div className={styles.signInIntro}>
        <Link className={styles.brand} href="/en">
          <span>
            <BrandLogo className={styles.brandLogo} />
            <small>STORE MANAGEMENT</small>
          </span>
        </Link>
        <div>
          <span className={styles.eyebrow}>WELCOME TO YOUR WORKSPACE</span>
          <h1>
            Everything your
            <br />
            store needs.
            <br />
            <span>One place.</span>
          </h1>
          <p>
            Manage your catalog, orders and customer experience from your MOPC
            workspace.
          </p>
        </div>
        <small>Built for the road ahead.</small>
      </div>
      <section className={`${styles.module} ${styles.signInForm}`}>
        {children}
        <p className={styles.signInNote}>
          <ShieldCheck size={15} />
          Access is reserved for authorized administrators.
        </p>
      </section>
    </main>
  );
}
export function AdminWorkspace({
  module,
  email,
  children,
}: {
  module: string;
  email: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const title =
    navigation.flatMap((g) => g.items).find((i) => i[0] === module)?.[1] ||
    "Administration";
  return (
    <main className={styles.workspace} lang="en" dir="ltr">
      {open && (
        <button
          className={styles.backdrop}
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <Link className={styles.brand} href="/admin">
          <span>
            <BrandLogo className={styles.brandLogo} />
            <small>STORE MANAGEMENT</small>
          </span>
        </Link>
        <div className={styles.navSearch}>
          <Search size={16} />
          <input
            aria-label="Find an admin section"
            placeholder="Find a section…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <nav aria-label="Administration">
          {navigation.map((group) => (
            <div className={styles.navGroup} key={group.title}>
              <p>{group.title}</p>
              {group.items
                .filter(([, label]) =>
                  label.toLowerCase().includes(query.toLowerCase()),
                )
                .map(([key, label, Icon]) => (
                  <Link
                    key={key}
                    href={`/admin?module=${key}`}
                    aria-current={module === key ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={18} strokeWidth={1.7} />
                    <span>{label}</span>
                    {module === key && <ChevronRight size={14} />}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <div className={styles.profile}>
          <span className={styles.avatar}>{email.charAt(0).toUpperCase()}</span>
          <div>
            <strong>Administrator</strong>
            <span>{email}</span>
          </div>
          <ShieldCheck size={17} />
        </div>
        <div className={styles.logout}>
          <LogOut size={16} />
          <ApiForm action="logout" label="Sign out" />
        </div>
      </aside>
      <div className={styles.body}>
        <header className={styles.topbar}>
          <div>
            <button
              className={styles.menu}
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className={styles.breadcrumb}>
              Workspace <ChevronRight size={14} /> <strong>{title}</strong>
            </span>
          </div>
          <Link href="/en" target="_blank" rel="noopener noreferrer">
            View storefront <ArrowUpRight size={16} />
          </Link>
        </header>
        <div className={styles.content}>
          <div className={styles.heading}>
            <div>
              <span className={styles.eyebrow}>YOUR STORE, AT A GLANCE</span>
              <h1>{title}</h1>
              <p>
                {descriptions[module] ||
                  `Manage your ${title.toLowerCase()} and store preferences.`}
              </p>
            </div>
            <Link className={styles.newProduct} href="/admin?module=products">
              <Plus size={18} />
              Add product
            </Link>
          </div>
          {module === "overview" && (
            <div className={styles.quickLinks}>
              {[
                [
                  "products",
                  "Manage products",
                  "Update parts and prices",
                  Package,
                ],
                [
                  "orders",
                  "Review orders",
                  "Manage customer purchases",
                  ShoppingBag,
                ],
                [
                  "inquiries",
                  "Customer inquiries",
                  "Keep conversations moving",
                  MessageSquare,
                ],
              ].map(([key, label, description, Icon]: any) => (
                <Link key={key} href={`/admin?module=${key}`}>
                  <span className={styles.quickIcon}>
                    <Icon size={21} />
                  </span>
                  <div>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </div>
                  <ArrowUpRight size={17} />
                </Link>
              ))}
            </div>
          )}
          <div className={styles.module}>{children}</div>
          <footer className={styles.footer}>
            <span>MOPC · Store administration</span>
            <span>
              <ShieldCheck size={13} /> Secure administrator access
            </span>
          </footer>
        </div>
      </div>
    </main>
  );
}
