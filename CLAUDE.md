# Portfolio (apostolos-peiniris) — codemap

Single-file static site: `index.html` (~1350 lines, all CSS/JS inline; big base64 hero bg on one line — NEVER `sed -n` ranges blindly, use Read with offsets).

## Deploy
https://apostolos-peiniris.vercel.app — Vercel project `apostolos-peiniris`, auto-deploys on `git push origin master` (GitHub TPAINN/apostolos-peiniris).

## Structure (line ranges drift — grep for anchors)
- Design: dark + copper/gold, Cormorant Garamond display + Montserrat + JetBrains Mono. EN/GR bilingual via `.t[data-en][data-gr]` + `toggleLang()`.
- Nav/hamburger: `#navHam` + `#mob-menu`; ONE anchor-click handler (routes `window.__lenis.scrollTo` when Lenis CDN loaded, else native `smoothGo` deferred one frame — Chrome drops smooth scroll issued same tick as body-overflow reset).
- Lenis IIFE at file bottom is guarded `typeof Lenis==='undefined'` and only drives the side progress bar; it must NOT attach its own anchor handlers (caused double-preventDefault bug).
- Scroll reveal: IntersectionObserver adds `.v` to `.reveal` — full-page screenshots show black sections unless reveals are forced.
- Breakpoints: 900px (mobile layout + ham), 768/640/380, `@media(max-height:540px) and (orientation:landscape)` compact hero, `pointer:coarse` hides custom cursor (top-level, do not re-nest).
- Cert cards `.ccard`: tap-to-preview on touch, PDF popup `#cpop` with `dlPDF()`.
