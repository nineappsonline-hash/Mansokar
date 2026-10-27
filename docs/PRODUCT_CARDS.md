# Product cards and purchase actions

Catalog, homepage, offers-list and related-product grids now show complete bordered cards. Each card contains its image, manufacturer, product name, selected-car fitment, price and actions inside one surface. Phone layouts use a single column so details and buttons are clearly associated with their product.

Add to cart adds one unit of that card's product and shows confirmation. Buy now ensures the selected quantity is in the cart and opens checkout; existing cart items are preserved, and clicking Buy now after Add to cart does not increment the same quantity again. Product-detail Buy now honors its quantity selector. Unorderable products have disabled actions. Special-offer cards expose the same buttons. Existing server-side pricing and checkout restrictions remain enforced.

Browser checks cover both languages, two distinct products, existing-cart preservation, product-detail quantity selection, special-offer buttons and home/catalog/offers layouts at 320, 390, 551, 768 and 1440px. See PRODUCT_CARD_CHECKS.json and screenshots/product-cards-{ar,en}-{desktop,mobile}.png. The ten-page WCAG audit has zero automated violations; TypeScript and the production build pass.
