# Free Google and AI discovery checklist

## Implemented in draft PR
- Canonical URLs and indexable metadata on four public landing pages.
- XML sitemap for home, shop, plaque and tumbler.
- Factual schema.org WebSite and CollectionPage structured data.
- Preserved exact shop HTML title because _web_worker.js uses it as a runtime switch.

## Owner actions after deployment (free)
1. Open https://search.google.com/search-console and verify ownership of reqoo.co (DNS domain property preferred).
2. Submit https://reqoo.co/sitemap.xml and inspect each URL for indexability.
3. Check https://shop.reqoo.co/commerce-sitemap.xml actually returns XML, otherwise remove stale robots.txt reference.
4. Check https://www.google.com/merchants/ and register a free Merchant Center account. Supply verified products with unique landing URLs, accurate prices, stock, shipping and returns; do not submit fictional listings.
5. Monitor indexed pages, impressions, clicks and queries in Search Console. Indexing and ranking are not guaranteed.

## AI discovery
- Keep public pages crawlable and use original, accurate product content with clear headings and useful FAQ.
- Do not block Googlebot or other crawlers needed for discovery; check Cloudflare bot rules.
- AI search systems decide independently what to cite; structured data is not a placement guarantee.
- Do not fabricate Product schema offers, ratings or stock. Add Product JSON-LD only to stable individual product URLs using verified catalog data.

## Remaining engineering
- Audit dynamic shop product URLs and whether search engines see unique product content without JavaScript.
- Create crawlable individual product pages and a catalog-driven sitemap if needed.
- Validate HTTP statuses, schema and metadata on deployed preview before merge.
