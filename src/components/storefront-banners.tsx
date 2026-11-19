import Link from "next/link";
import { BannerMotion } from "./banner-motion";
import type { CSSProperties } from "react";
import {
  ArrowUpRight,
  CarFront,
  Check,
  Coins,
  CreditCard,
  Headset,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { Locale } from "@/lib/catalog";
import styles from "./storefront-banners.module.css";

export function BenefitsBanner({
  locale,
  cardPayments,
}: {
  locale: Locale;
  cardPayments: boolean;
}) {
  const ar = locale === "ar";
  const benefits = [
    {
      icon: ShieldCheck,
      title: ar ? "أصلية وبضمان" : "Genuine. Guaranteed.",
      detail: ar ? "قطع غيار أصلية بضمان" : "Genuine parts with warranty",
      motif: "shield",
    },
    {
      icon: CarFront,
      title: ar ? "القطعة المناسبة" : "Made for your car",
      detail: ar ? "اختار حسب عربيتك" : "Find parts by your vehicle",
      motif: "car",
    },
    {
      icon: Coins,
      title: ar ? "أسعار واضحة" : "Clear pricing",
      detail: ar ? "تفاصيل أوضح قبل الشراء" : "Know the details before you buy",
      motif: "coins",
    },
    {
      icon: CreditCard,
      title: ar ? "ادفع بطريقتك" : "Pay your way",
      detail: ar
        ? cardPayments
          ? "كروت وطرق دفع مرنة"
          : "إنستاباي ومحافظ إلكترونية"
        : cardPayments
          ? "Cards & flexible payments"
          : "InstaPay & mobile wallets",
      motif: "payment",
    },
    {
      icon: Truck,
      title: ar ? "لحد بابك" : "To your doorstep",
      detail: ar ? "شحن لكل محافظات مصر" : "Delivery across Egypt",
      motif: "delivery",
    },
    {
      icon: Headset,
      title: ar ? "معاك في كل خطوة" : "Here to help",
      detail: ar ? "دعم قبل وبعد الشراء" : "Support before and after purchase",
      motif: "support",
    },
  ];
  return (
    <BannerMotion
      className={`shell ${styles.benefits}`}
      label={ar ? "مميزات التسوق مع موبك" : "Why shop with MOPC"}
    >
      <div className={styles.benefitsIntro}>
        <span className={styles.eyebrow}>
          MOPC / {ar ? "راحة بالك" : "PEACE OF MIND"}
        </span>
        <h2>{ar ? "كل تفصيلة، لراحة بالك." : "Confidence in every detail."}</h2>
        <span className={styles.introLine} aria-hidden="true" />
      </div>
      <div className={styles.benefitGrid}>
        {benefits.map(({ icon: Icon, title, detail, motif }, index) => (
          <div
            className={styles.benefit}
            key={motif}
            style={{ "--benefit-index": index } as CSSProperties}
          >
            <div
              className={`${styles.iconScene} ${styles[motif]}`}
              aria-hidden="true"
            >
              <span className={styles.orbit} />
              <span className={styles.satellite} />
              <span className={styles.iconPlate}>
                <Icon size={30} strokeWidth={1.6} />
              </span>
              <span className={styles.iconDetail}>
                {motif === "shield" || motif === "car" ? (
                  <Check size={11} strokeWidth={3} />
                ) : (
                  <span />
                )}
              </span>
            </div>
            <div className={styles.benefitCopy}>
              <h3>{title}</h3>
              <p>{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </BannerMotion>
  );
}

export function PaymentBanner({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  return (
    <BannerMotion
      className={`shell ${styles.payments}`}
      labelledBy="payment-heading"
    >
      <div className={styles.paymentCopy}>
        <span className={styles.paymentEyebrow}>
          {ar ? "الدفع والتقسيط" : "PAYMENT & INSTALLMENTS"}
        </span>
        <h2 id="payment-heading">
          {ar ? (
            <>
              خيارات دفع مرنة.
              <br />
              <span>تجربة شراء أسهل.</span>
            </>
          ) : (
            <>
              Flexible ways to pay.
              <br />
              <span>A simpler way to shop.</span>
            </>
          )}
        </h2>
        <p>
          {ar
            ? "تعرّف على خيارات الدفع والتقسيط المتاحة، واختار الأنسب لك قبل إتمام طلبك."
            : "Discover available payment and installment options, and choose what works for you before checkout."}
        </p>
        <Link href={`/${locale}/installments`} className={styles.paymentLink}>
          {ar ? "استعرض خيارات الدفع" : "View payment options"}
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className={styles.paymentArt} aria-hidden="true">
        <img
          src="/images/payment-editorial-navy.png"
          alt=""
          width={1536}
          height={1024}
          loading="lazy"
          decoding="async"
        />
      </div>
    </BannerMotion>
  );
}
