"use client";
import { useEffect, useRef, useState } from "react";
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
  Inbox,
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
    title: "العمليات اليومية",
    items: [
      ["overview", "نظرة عامة", LayoutDashboard],
      ["orders", "الطلبات", ShoppingBag],
      ["messages", "رسائل العملاء", Inbox],
      ["inquiries", "طلبات قطع الغيار", MessageSquare],
      ["customers", "العملاء", Users],
    ],
  },
  {
    title: "المنتجات والسيارات",
    items: [
      ["products", "المنتجات", Package],
      ["vehicles", "السيارات والتوافق", Car],
      ["recommendations", "المنتجات المرتبطة", Layers],
    ],
  },
  {
    title: "التسويق والمتجر",
    items: [
      ["campaigns", "البانرات الإعلانية", Megaphone],
      ["promotions", "كوبونات الخصم", Ticket],
      ["hero-slideshow", "صور الصفحة الرئيسية", GalleryHorizontalEnd],
      ["branding", "هوية المتجر", Palette],
      ["cms", "الصفحات والسياسات", FileText],
    ],
  },
  {
    title: "التقارير والإعدادات",
    items: [
      ["reports", "تقارير المبيعات", BarChart3],
      ["analytics", "تحليلات الزوار", BarChart3],
      ["seo", "تحسين الظهور في البحث", Search],
      ["shipping", "أسعار التوصيل", Truck],
      ["settings", "إعدادات المتجر", Settings],
    ],
  },
];
const descriptions: Record<string, string> = {
  overview: "تابع الطلبات والمدفوعات واستفسارات العملاء في مكان واحد.",
  products: "إدارة قطع الغيار والأسعار والتوافق مع السيارات.",
  orders: "متابعة الطلبات وحالات الدفع والشحن.",
  messages: "قراءة رسائل العملاء وتحديث حالتها.",
  inquiries: "متابعة طلبات قطع الغيار واستفسارات العملاء.",
  shipping: "تحديد أسعار وخيارات التوصيل.",
  vehicles: "إدارة الماركات والموديلات وسنوات التصنيع المدعومة.",
  seo: "مراجعة ظهور المتجر والمنتجات في نتائج البحث.",
  customers: "متابعة حسابات العملاء وطلباتهم وملاحظاتهم.",
  recommendations: "اختيار قطع الغيار البديلة والمرتبطة.",
  campaigns: "إدارة البانرات والحملات الإعلانية.",
  promotions: "إنشاء كوبونات الخصم ومتابعة صلاحيتها.",
  cms: "تعديل صفحات المتجر والسياسات.",
  branding: "إدارة شعار المتجر والصور والهوية البصرية.",
  "hero-slideshow": "ترتيب صور الصفحة الرئيسية وضبط عرضها.",
  reports: "متابعة المبيعات والمدفوعات خلال فترة محددة.",
  analytics: "عرض إحصائيات زيارات المتجر.",
  settings: "تعديل بيانات المتجر ومراجعة طرق الدفع.",
};
export function AdminSignIn({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={`${styles.workspace} ${styles.signIn}`}
      lang="ar"
      dir="rtl"
    >
      <div className={styles.signInIntro}>
        <Link className={styles.brand} href="/ar">
          <span>
            <BrandLogo className={styles.brandLogo} />
            <small>إدارة المتجر</small>
          </span>
        </Link>
        <div>
          <span className={styles.eyebrow}>أهلًا بك في لوحة الإدارة</span>
          <h1>
            إدارة متجرك\n            <br />\n            <span>في مكان واحد.</span>
          </h1>
          <p>
            Manage your catalog, orders and customer experience from your MOPC
            workspace.
          </p>
        </div>
        <small>كل أدوات الإدارة في مكان واحد.</small>
      </div>
      <section className={`${styles.module} ${styles.signInForm}`}>
        {children}
        <p className={styles.signInNote}>
          <ShieldCheck size={15} />
          الدخول متاح لمديري المتجر المصرح لهم فقط.
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
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const needle = query.trim().toLowerCase();
  const groups = navigation
    .map((g) => ({
      ...g,
      items: g.items.filter(([, label]) =>
        label.toLowerCase().includes(needle),
      ),
    }))
    .filter((g) => g.items.length);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled),input:not(:disabled)",
        ) ?? [],
      ).filter((e) => e.getClientRects().length);
    focusable()[0]?.focus();
    const close = () => {
      setOpen(false);
      menuButton.current?.focus();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab") {
        const nodes = focusable(),
          first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const title =
    module === "overview" ? "لوحة التحكم" : navigation.flatMap((g) => g.items).find((i) => i[0] === module)?.[1] ||
    "أقسام الإدارة";
  return (
    <main className={styles.workspace} lang="ar" dir="rtl">
      {open && (
        <button
          className={styles.backdrop}
          aria-label="إغلاق القائمة"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sidebar}
        className={`${styles.sidebar} ${open ? styles.open : ""}`}
      >
        <button
          type="button"
          className={styles.closeNav}
          aria-label="إغلاق القائمة"
          onClick={() => {
            setOpen(false);
            menuButton.current?.focus();
          }}
        >
          <X size={21} />
        </button>
        <Link className={styles.brand} href="/admin">
          <span>
            <BrandLogo className={styles.brandLogo} />
            <small>إدارة المتجر</small>
          </span>
        </Link>
        <div className={styles.navSearch}>
          <Search size={16} />
          <input
            aria-label="البحث في أقسام الإدارة"
            placeholder="ابحث عن قسم…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <nav aria-label="أقسام الإدارة">
          {groups.map((group) => (
            <div className={styles.navGroup} key={group.title}>
              <p>{group.title}</p>
              {group.items.map(([key, label, Icon]) => (
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
          {!groups.length && (
            <p className={styles.noMatches} role="status">
              لا توجد أقسام تطابق “{query}”.
            </p>
          )}
        </nav>
        <div className={styles.profile}>
          <span className={styles.avatar}>{email.charAt(0).toUpperCase()}</span>
          <div>
            <strong>مدير المتجر</strong>
            <span>{email}</span>
          </div>
          <ShieldCheck size={17} />
        </div>
        <div className={styles.logout}>
          <LogOut size={16} />
          <ApiForm action="logout" label="تسجيل الخروج" />
        </div>
      </aside>
      <div className={styles.body}>
        <header className={styles.topbar}>
          <div>
            <button
              ref={menuButton}
              className={styles.menu}
              aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className={styles.breadcrumb}>
              لوحة الإدارة <ChevronRight size={14} /> <strong>{title}</strong>
            </span>
          </div>
          <Link href="/en" target="_blank" rel="noopener noreferrer">
            عرض المتجر <ArrowUpRight size={16} />
          </Link>
        </header>
        <div className={styles.content}>
          <div className={`${styles.heading} ${module === "overview" ? "admin-dashboard-heading" : ""}`}>
            <div>
              <span className={styles.eyebrow}>
                {navigation
                  .find((g) => g.items.some((i) => i[0] === module))
                  ?.title ?? "إدارة المتجر"}
              </span>
              <h1>{title}</h1>
              <p>
                {descriptions[module] ||
                  "إدارة إعدادات وبيانات هذا القسم."}
              </p>
            </div>
            <Link
              className={styles.newProduct}
              href="/admin?module=products#product-editor"
            >
              <Plus size={18} />
              إضافة منتج
            </Link>
          </div>
          <div className={styles.module}>{children}</div>
          <footer className={styles.footer}>
            <span>MOPC · إدارة المتجر</span>
            <span>
              <ShieldCheck size={13} /> دخول آمن للإدارة
            </span>
          </footer>
        </div>
      </div>
    </main>
  );
}
