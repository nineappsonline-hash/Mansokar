import type { Locale } from "@/lib/catalog";
import { ApiForm } from "./forms";
export function ContactForm({
  locale,
  enabled,
}: {
  locale: Locale;
  enabled: boolean;
}) {
  const ar = locale === "ar";
  return (
    <section className="panel stack" id="callback">
      <h2>
        {ar
          ? "سيب رقمك واستفسارك وهنتواصل معاك"
          : "Leave your number and inquiry and we will contact you"}
      </h2>
      <p>
        {ar
          ? "لطلب مساعدة بخصوص الشحن أو الاسترجاع أو الضمان، املأ النموذج. أضف رقم الطلب داخل الاستفسار إن وجد. لا ترسل بيانات كارت أو أكواد تحقق أو رقم شاسيه كامل."
          : "Use this form for shipping, returns or warranty assistance. Include the order number in your inquiry if available. Do not send card details, verification codes or a full VIN."}
      </p>
      <ApiForm
        action="contact"
        label={ar ? "إرسال طلب التواصل" : "Request a callback"}
        extra={{ ui_locale: locale }}
        disabled={!enabled}
      >
        <label>
          {ar ? "رقم الموبايل" : "Mobile number"}
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            dir="ltr"
            pattern="01[0125][0-9]{8}"
            maxLength={11}
            placeholder="01xxxxxxxxx"
            required
          />
        </label>
        <label>
          {ar ? "موضوع الاستفسار" : "Inquiry topic"}
          <select name="topic" required>
            <option value="shipping">
              {ar ? "الشحن والتوصيل" : "Shipping and delivery"}
            </option>
            <option value="returns">
              {ar ? "استبدال أو استرجاع" : "Returns or exchanges"}
            </option>
            <option value="warranty">
              {ar ? "ضمان المنتج" : "Product warranty"}
            </option>
            <option value="other">
              {ar ? "استفسار آخر" : "Other inquiry"}
            </option>
          </select>
        </label>
        <label>
          {ar ? "استفسارك" : "Your inquiry"}
          <textarea
            name="inquiry"
            rows={5}
            minLength={10}
            maxLength={3000}
            required
          />
        </label>
        <label className="check">
          <input name="consent" type="checkbox" value="yes" required />
          {ar
            ? "أوافق على استخدام رقم هاتفي ومحتوى الاستفسار للتواصل معي بخصوص هذا الطلب."
            : "I agree to my phone number and inquiry being used to contact me about this request."}
        </label>
      </ApiForm>
      {!enabled && (
        <p role="status">
          {ar
            ? "طلب التواصل غير متاح حاليًا. يُرجى المحاولة لاحقًا."
            : "Callback requests are currently unavailable. Please try again later."}
        </p>
      )}
    </section>
  );
}
