# Pineloop — company website

Static site. No build step, no dependencies, no framework. Every file here is the
file that gets served.

```
.
├── index.html            /            home
├── platform/index.html   /platform/
├── processes/index.html  /processes/
├── deploy/index.html     /deploy/
├── contact/index.html    /contact/    discovery call form
├── 404.html
├── assets/
│   ├── styles.css        all styling, extracted from the original single file
│   ├── site.js           nav, scroll state, reveals, diagram trace, form
│   ├── favicon.svg
│   ├── icon-180.png      apple-touch-icon
│   ├── icon-192.png
│   ├── icon-512.png
│   └── og-image.png      1200×630 share card
├── favicon.ico           legacy /favicon.ico requests
├── site.webmanifest
├── robots.txt
├── sitemap.xml
├── netlify.toml          headers, caching, CSP  ← Netlify reads this
├── vercel.json           the same, for Vercel (Netlify ignores it)
└── .gitignore
```

Push the **contents** of this folder as the repository root, not the folder
itself. `index.html` must sit at the top level of the repo, otherwise Netlify
publishes a directory listing.

## What changed from the single-file version

The original was one HTML file with a hash router (`#/platform`). Everything on
the page rendered on every route, and search engines saw one URL. It is now five
real pages, which is what a company site needs:

- Each page has its own URL, `<title>`, meta description, canonical, and Open
  Graph tags.
- CSS and JS are shared external files, so they are cached once across the site.
- The contact form posts to a real endpoint instead of calling `preventDefault`
  and showing a confirmation that admitted nothing had been sent.
- Old `#/platform`-style links still work: `site.js` forwards them to the real
  URL. Safe to delete that block once nothing in the wild points at them.

The design, copy, palette, typefaces, diagrams, and animation are unchanged.

## Before you deploy — three things to replace

**1. The domain.** Every canonical URL, Open Graph URL, and sitemap entry uses
`https://pineloop.com` as a placeholder. Replace it everywhere:

```bash
grep -rl 'pineloop\.com' . | xargs sed -i '' 's|pineloop\.com|yourdomain\.com|g'   # macOS
grep -rl 'pineloop\.com' . | xargs sed -i    's|pineloop\.com|yourdomain\.com|g'   # Linux
```

Then set the same host in `netlify.toml` if you want the apex/www redirect (it is
commented out at the bottom of that file).

**2. The contact inbox.** `contact/index.html` names `hello@pineloop.com` in the
form's failure state as a fallback address. Point it at a real inbox.

**3. The scheduling link, if you have one.** Every "Book a discovery call" button
points at `/contact/`. If you would rather send people to Cal.com or Calendly,
each one is marked with an HTML comment: search for `BOOK A DISCOVERY CALL`.

## Deploying

### Netlify — recommended, because the form works with no extra service

```bash
git init && git add -A && git commit -m "Pineloop site"
# push to GitHub, then in Netlify: Add new site → Import from Git
# Build command: (leave blank)   Publish directory: .
```

Or drag the folder onto <https://app.netlify.com/drop>.

The contact form is already marked up for Netlify Forms (`data-netlify="true"`,
honeypot field, hidden `form-name`). Netlify detects it from the static HTML at
deploy time. **Go to Forms → discovery-call → Settings and add a notification
email**, otherwise submissions sit in the dashboard and nobody sees them.

### Vercel

```bash
npx vercel --prod
```

`vercel.json` sets `cleanUrls` and the security headers. Netlify Forms will not
work here — see the next section.

### Cloudflare Pages, S3, Nginx, anything else

Upload the folder. For Cloudflare Pages, add a `_headers` file at the root with
the header block copied out of `netlify.toml` in plain-text form:

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Content-Security-Policy: <copy the one line from netlify.toml>

/assets/*
  Cache-Control: public, max-age=3600, must-revalidate
```

Do not add that file if you are on Netlify — Netlify reads both `_headers` and
`netlify.toml` and would set every header twice. On Nginx you want
`try_files $uri $uri/index.html =404` plus the same headers in your server block.

## Switching the form to another provider

`assets/site.js` posts URL-encoded form data to whatever is in the form's
`action` attribute and treats any 2xx as success. That is the contract Formspree,
Basin, Web3Forms, and a plain endpoint of your own all satisfy. To switch:

1. In `contact/index.html`, change `action="/"` to the provider's endpoint and
   delete the `data-netlify`, `netlify-honeypot`, and hidden `form-name` bits.
2. Add the provider's origin to `connect-src` and `form-action` in the CSP —
   there is a comment above it in `netlify.toml` showing the shape.

## Notes

- **Fonts** load from Google Fonts. If you would rather not depend on a third
  party (or you need to keep EU visitor data off Google's servers), download
  Archivo, IBM Plex Mono, and Public Sans, drop the woff2 files in `assets/`, add
  `@font-face` rules at the top of `styles.css`, and delete the two
  `fonts.googleapis.com` links plus the `preconnect` lines from every page head.
- **CSP** is strict: no inline scripts beyond the one hashed no-js toggle, no
  third-party JS. If you add analytics you will need to widen `script-src` and
  `connect-src` in `netlify.toml` / `vercel.json` / `_headers`.
- **Caching** on `/assets/*` is one hour rather than a year, because the
  filenames are not fingerprinted. If you start versioning them
  (`styles.a1b2c3.css`), raise it to `max-age=31536000, immutable`.
- **Analytics** are not installed. Nothing on the site sets a cookie or calls a
  third party except Google Fonts, so as it stands you do not need a cookie
  banner. Adding analytics changes that.
- **Accessibility** carried over intact: skip link, visible focus rings, labelled
  diagrams, `prefers-reduced-motion` respected, keyboard-operable mobile nav.

## Local preview

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Note that `python3 -m http.server` will not
accept the form POST, so submitting shows the failure state locally — that is
expected, not a bug.
