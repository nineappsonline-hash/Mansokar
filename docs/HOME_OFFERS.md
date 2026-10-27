# Homepage special offers

The homepage now includes a bilingual special-offers section between the trust strip and the popular-parts collection. It highlights up to four published, orderable products with a valid sale price below the list price. Prices and savings come from catalog data; there are no invented expiry dates or countdowns.

With an active vehicle, only explicitly confirmed fitments are featured, and the View all offers link retains that vehicle. When there are no eligible offers, the section shows a localized empty state. Product links open the existing detail page. Available merchant photos are used; demo illustrations remain clearly labeled and unavailable media has a neutral fallback.

Manage inclusion through the product editor's sale price, publication status, orderable toggle and fitment mappings. Existing demo discounts remain fictional test data.

Validation: TypeScript and production build pass; browser checks verify prices, exact savings, links, engine mismatch behavior and responsive layouts in both languages. The ten-page automated WCAG audit reports zero violations. Evidence: SPECIAL_OFFERS_CHECKS.json, ACCESSIBILITY_RESULTS.json and screenshots/special-offers-{ar,en}-{desktop,mobile}.png.
