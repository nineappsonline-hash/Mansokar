# Screenshot-driven storefront refresh

The user supplied the sunset mountain road / SUV DriveParts reference. Rebuilt the composition as functional HTML/React rather than using the screenshot as a flattened interface.

Changes: transparent header with amber gear mark; two-line live Arabic/English heading with an original SVG painted highlight; white search field with the reference's red action; left copy/right SUV composition; four grille-photo cards with individual amber/blue/red borders, white manufacturer emblems and working model-selection links; two-column mobile cards; reduced-motion support.

## Generated assets

Created using the built-in image generation tool, then encoded as optimized WebP files in `public/images/cinematic/`. Original generations are retained in the tool's generated-images directory. These are illustrative navigation/hero assets, not product photography or fitment evidence. All existing real model photographs remain available on model selection pages.

- `hero-road-v2.webp`: sunset mountain road; rugged charcoal SUV from rear three-quarter on the right; dark mountains/negative space on the left; no text, cards or UI. User screenshot supplied as visual reference.
- `opel-v2.webp`: dark graphite Opel Astra grille/headlight close-up, warm amber lighting, near-black lower third.
- `peugeot-v2.webp`: midnight-blue Peugeot 3008 grille/headlight close-up, electric-blue lighting, near-black lower third.
- `citroen-v2.webp`: deep-red Citroën C5 Aircross grille/headlight close-up, warm red/amber lighting, near-black lower third.
- `mg-v2.webp`: glossy-red MG HS grille/headlight close-up, crimson lighting, near-black lower third.

## Prompt set

Hero prompt:

> Create a photorealistic background photograph asset for the existing DriveParts automotive website, matching the visual composition and atmosphere of the user's attached screenshot (reference only, not edit target). Output image only, landscape 1792x1024 or wide 16:9. Sunset mountain road, dark rugged rocky mountains on left and middle distance, winding asphalt road in lower half, beautiful amber sun near right edge with cinematic orange clouds. A premium rugged dark charcoal off-road SUV seen from rear three-quarter, spare wheel on rear and roof rack, on the RIGHT HALF of frame, large but fully visible, bottom wheels around 83% of image height. No visible make/model logo. Left half is darker uncluttered mountains usable for white Arabic heading and search overlaid in HTML. Upper 12% relatively dark for navigation. Rich warm amber light reflecting off car, authentic detailed photographic textures, dramatic premium automotive advertising aesthetic. Crucial: NO TEXT, NO UI, NO CARDS, NO LETTERS, NO WATERMARK, no frame. This is the underlying hero photograph only. Match reference sunset-road mood, do not include screenshot browser or its interface.

Brand prompt template (one separate generation for each tuple below):

> Use case: ads-marketing. Asset type: automotive website brand-card background photograph, portrait 4:5. Create a dramatic extreme close-up front three-quarter photograph of a {color} {model}, correct recognizable modern grille, headlight design and original grille manufacturer emblem. Upper two-thirds feature the front headlight and grille, tightly cropped on both sides, at a low heroic angle. The lower third fades smoothly into near-black space for an actual HTML brand logo and Arabic caption to be overlaid later. Dark cinematic black studio / mountain dusk backdrop, {lighting} edge lighting and reflections, premium automotive advertising style, realistic beautiful detailed paint and LEDs. Vehicle should fill the frame, particularly upper left headlight / grille. No person. NO ADDED TEXT, NO WRITTEN BRAND NAME, NO UI, NO BORDER, NO WATERMARK, NO FLOATING LOGOS, NO CAPTIONS. Only the car photograph, recognizable {model} grille emblem can be physically present. This is a model illustration for a branded parts-store navigation card, not an image of a purchasable SKU.

| Model               | Color         | Lighting           |
| ------------------- | ------------- | ------------------ |
| Opel Astra          | dark graphite | warm amber/gold    |
| Peugeot 3008        | midnight blue | cool electric blue |
| Citroën C5 Aircross | deep red      | warm red and amber |
| MG HS               | glossy red    | crimson red        |

Manufacturer SVG emblems: Opel, Peugeot and MG from the Simple Icons repository, `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/{opel,peugeot,mg}.svg`; Citroën from the official 2022 emblem, [Citroen 2022.svg](https://commons.wikimedia.org/wiki/File:Citroen_2022.svg). All rendered white. Brand marks identify their respective manufacturers. Original model-photo author/license credits remain in ASSETS.md and the credits page.

Screenshots: `docs/screenshots/reference-redesign-desktop.png` and `reference-redesign-ar-mobile.png` and `reference-redesign-en-mobile.png`.

## Verification

Production build and TypeScript checks pass. All eleven automated tests pass. Production browser checks pass for both languages, brand/model navigation, fitment privacy, cart actions, locale preservation, gallery keyboard access and mobile overflow. Ten Arabic/English page audits have zero automated axe WCAG violations. Reference-specific checks confirm clickable grille cards and headings fitting 320px phones. See BROWSER_RESULTS.json, ACCESSIBILITY_RESULTS.json and REFERENCE_DESIGN_CHECKS.json.
