# One-time setup (owner)

## 1. Cloudflare Pages (~10 min)
1. Sign in at dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git.
2. Authorize GitHub, pick `ynreddy7/trafficchallan`.
3. Build command: `npm run build`  · Output directory: `dist` · Framework preset: Astro.
4. Deploy. Then Pages project → Custom domains → add `trafficchallan.com`.
5. Add site `trafficchallan.com` to Cloudflare (Free plan) and change nameservers
   at your registrar to the two Cloudflare gives you. Wait for "Active".
6. Bulk Redirects (or a Page Rule): `www.trafficchallan.com/*` → `https://trafficchallan.com/$1` (301).

## 2. Email routing (~3 min)
Cloudflare → Email → Email Routing → enable; route `contact@trafficchallan.com` → ynitishreddy96@gmail.com.

## 3. Search Console (~5 min)
1. search.google.com/search-console → Add property → Domain → `trafficchallan.com`.
2. Copy the TXT record into Cloudflare DNS. Verify.
3. Sitemaps → submit `https://trafficchallan.com/sitemap-index.xml`.

## 4. Bing Webmaster Tools (~2 min)
bing.com/webmasters → Import from Google Search Console.

## 5. (Optional now) Cloudflare Web Analytics
Cloudflare → Analytics → Web Analytics → add site → copy the token → tell Claude to wire it in.

## Later (after ~30 pages indexed)
- AdSense: adsense.google.com → apply with trafficchallan.com.
- Affiliate: ACKO / InsuranceDekho / FASTag partner signups.
