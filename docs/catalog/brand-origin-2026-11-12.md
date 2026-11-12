# Brand and origin catalog update — 12 November 2026

The owner requested GM for every product whose brand was blank or labeled `أصلي`, and `أصلي` in the origin field for all products. The guarded update scanned all 430 product records, changed 192, replaced 186 fallback brand values with GM, and set six missing or different origin values to `أصلي`. Each changed record was read back; a second dry run found zero remaining changes. The restricted rollback snapshot is recorded in `brand-origin-result.json`.

`أصلي` is an authenticity description, not a country. The storefront continues to show it as "Genuine" where appropriate and does not mark it up as a country of manufacture. The product editor now defaults new products to GM. Existing named brands were left intact.
