# Storefront typography update

Arabic now uses self-hosted Tajawal (400, 500, 700 and 800); English uses self-hosted variable Inter. Both are licensed under SIL OFL, with license files in `public/fonts/`. Optimized WOFF2 delivery totals approximately 85 KB across all font files; each page loads only the weights it uses. Cairo remains a legacy asset and is no longer selected.

Body text increased from 15px to 18px (17px on phones). Navigation is 17px with stronger weight; buttons and field labels are 16px; desktop product names are 22px and prices 23px. Brand captions, compatibility messages, filters, policy text and footer links are larger. Headings retain the cinematic design with bolder, clearer letterforms. Narrow phone layouts adjust spacing and logo-icon sizing to preserve the larger text.

Verification: production build; 40 fully rendered layout checks across Arabic/English, home/product/catalog/checkout and 320/390/768/1024/1440px widths; ten-page automated WCAG audit. Results are in `TYPOGRAPHY_CHECKS.json` and `ACCESSIBILITY_RESULTS.json`. Previews are `docs/screenshots/typography-{ar,en}-{desktop,mobile}.png`.
