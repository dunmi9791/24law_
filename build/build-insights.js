import {createClient} from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import {toHTML} from '@portabletext/to-html'
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'fs'
import {resolve, dirname} from 'path'
import {fileURLToPath} from 'url'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Sanity client
// ---------------------------------------------------------------------------

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_READ_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: true,
})

const imgBuilder = imageUrlBuilder(client)
const urlFor = (ref) => imgBuilder.image(ref)

// ---------------------------------------------------------------------------
// Category map (value → display label)
// ---------------------------------------------------------------------------

const CATEGORY_LABELS = {
  'public-revenue': 'Public Revenue',
  energy: 'Energy & Power',
  'oil-gas': 'Oil & Gas',
  arbitration: 'Arbitration',
  infrastructure: 'Infrastructure',
  regulatory: 'Regulatory',
  'cross-border': 'Nigeria–UK',
  insolvency: 'Insolvency',
}

// ---------------------------------------------------------------------------
// Portable Text → HTML serializers (matches existing article.html styles)
// ---------------------------------------------------------------------------

const portableTextComponents = {
  block: {
    normal: ({children}) => {
      const text = String(children).replace(/<br\s*\/?>/g, '').trim()
      if (!text) return ''
      return `<p style="margin-top:18px;">${children}</p>`
    },
    h2: ({children}) =>
      `<h2 class="h2" style="margin-top:48px;">${children}</h2>`,
    h3: ({children}) =>
      `<h3 style="margin-top:32px;font-size:clamp(20px,2vw,28px);">${children}</h3>`,
    blockquote: ({children}) =>
      `<blockquote class="pull-quote" style="margin:56px 0;font-size:clamp(26px,3vw,40px);"><span class="mark">&ldquo;</span>${children}</blockquote>`,
  },
  marks: {
    strong: ({children}) => `<strong>${children}</strong>`,
    em: ({children}) => `<em>${children}</em>`,
    link: ({children, value}) =>
      `<a href="${escapeAttr(value.href)}" style="border-bottom:1px solid var(--rule-strong);">${children}</a>`,
  },
  types: {
    image: ({value}) => {
      const src = urlFor(value).width(1100).auto('format').url()
      const alt = escapeAttr(value.alt || '')
      const caption = value.caption
        ? `<figcaption style="font-size:13px;color:var(--ink-mute);margin-top:8px;">${escapeHTML(value.caption)}</figcaption>`
        : ''
      return `<figure style="margin:40px 0;"><img src="${src}" alt="${alt}" style="width:100%;border-radius:2px;" />${caption}</figure>`
    },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(str) {
  return escapeHTML(str).replace(/'/g, '&#39;')
}

function formatDate(isoDate) {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-GB', {month: 'short', year: 'numeric'})
}

function applyTitleEmphasis(title, emphasisWords) {
  if (!emphasisWords) return escapeHTML(title)
  const escaped = escapeHTML(title)
  const emphEscaped = escapeHTML(emphasisWords)
  return escaped.replace(emphEscaped, `<em>${emphEscaped}</em>`)
}

// ---------------------------------------------------------------------------
// Shared HTML partials (extracted from existing site)
// ---------------------------------------------------------------------------

function HEADER(p = '') {
  return `<header class="site-header">
  <div class="wrap bar">
    <a href="${p}index.html" class="brand"><img src="${p}assets/logo.png" alt="24 Law Chambers" class="logo-img" /></a>
    <nav class="nav-primary" aria-label="Primary">
      <a href="${p}index.html">Home</a>
      <a href="${p}about.html">About</a>
      <a href="${p}strategic-mandates.html">Strategic Mandates</a>
      <a href="${p}practice-areas.html">Expertise</a>
      <a href="${p}nigeria-uk-counsel.html">Nigeria–UK Counsel</a>
      <a href="${p}our-people.html">People</a>
      <a href="${p}insights.html" aria-current="page">Insights</a>
      <a href="${p}contact.html">Contact</a>
    </nav>
    <div class="header-cta">
      <a class="btn btn-ink" href="${p}contact.html">Discuss a Strategic Mandate
        <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
      <button class="menu-toggle" data-menu-toggle aria-label="Open menu"><span></span><span></span></button>
    </div>
  </div>
</header>

<aside class="mobile-drawer" data-mobile-drawer aria-label="Mobile menu">
  <ul>
    <li><a href="${p}index.html"><span>Home</span><span class="num">01</span></a></li>
    <li><a href="${p}about.html"><span>About</span><span class="num">02</span></a></li>
    <li><a href="${p}strategic-mandates.html"><span>Strategic Mandates</span><span class="num">03</span></a></li>
    <li><a href="${p}practice-areas.html"><span>Expertise</span><span class="num">04</span></a></li>
    <li><a href="${p}nigeria-uk-counsel.html"><span>Nigeria–UK Counsel</span><span class="num">05</span></a></li>
    <li><a href="${p}our-people.html"><span>People</span><span class="num">06</span></a></li>
    <li><a href="${p}insights.html"><span>Insights</span><span class="num">07</span></a></li>
    <li><a href="${p}contact.html"><span>Contact</span><span class="num">08</span></a></li>
  </ul>
</aside>`
}

function FOOTER(p = '') {
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="${p}assets/logo-cream.png" alt="24 Law Chambers" style="height:34px;width:auto;" />
        <p>A Nigerian law firm providing senior strategic legal counsel for high-value public-sector recovery, energy and infrastructure disputes, regulatory enforcement, arbitration, and Nigeria–UK cross-border legal coordination.</p>
        <p style="margin-top:10px;font-style:italic;font-family:var(--display);font-size:16px;color:var(--brass);">As Above, So Below.</p>
      </div>
      <div class="footer-col"><h4>Firm</h4><ul>
        <li><a href="${p}about.html">About</a></li><li><a href="${p}strategic-mandates.html">Strategic Mandates</a></li><li><a href="${p}our-people.html">People</a></li><li><a href="${p}insights.html">Insights</a></li><li><a href="${p}contact.html">Contact</a></li>
      </ul></div>
      <div class="footer-col"><h4>Expertise</h4><ul>
        <li><a href="${p}practice-area.html">Public Revenue Recovery</a></li><li><a href="${p}practice-area.html">Energy &amp; Infrastructure</a></li><li><a href="${p}practice-area.html">Litigation &amp; Arbitration</a></li><li><a href="${p}nigeria-uk-counsel.html">Nigeria–UK Counsel</a></li><li><a href="${p}practice-areas.html">View all 10 &rarr;</a></li>
      </ul></div>
      <div class="footer-col footer-newsletter"><h4>Newsletter</h4>
        <p style="color:rgba(242,237,226,.7);font-size:14.5px;margin:0 0 4px;">Briefings on Nigerian law, quarterly.</p>
        <form data-newsletter><input type="email" placeholder="you@firm.com" required /><button type="submit" aria-label="Subscribe"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>
        <div data-status style="font-size:12px;color:rgba(242,237,226,.55);margin-top:8px;min-height:14px;"></div>
      </div>
    </div>
    <div class="footer-base">
      <div>&copy; ${new Date().getFullYear()} 24 Law Chambers. All rights reserved.</div>
      <ul><li><a href="#">Terms of Use</a></li><li><a href="#">Disclaimer</a></li><li><a href="#">Privacy</a></li></ul>
      <div class="footer-socials">
        <a href="#" aria-label="LinkedIn"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.32 0h4.37v1.92h.06c.61-1.16 2.1-2.38 4.32-2.38 4.62 0 5.47 3.04 5.47 7v8.46h-4.56v-7.5c0-1.79-.03-4.1-2.5-4.1-2.5 0-2.88 1.95-2.88 3.97V22H7.54V8z"/></svg></a>
        <a href="#" aria-label="Twitter"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
        <a href="#" aria-label="Instagram"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></svg></a>
      </div>
    </div>
  </div>
</footer>`
}

const ARROW_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'

// ---------------------------------------------------------------------------
// Generate a single article page
// ---------------------------------------------------------------------------

function buildArticlePage(article, relatedArticles) {
  const catLabel = CATEGORY_LABELS[article.category] || article.category
  const dateStr = formatDate(article.publishedAt)
  const heroUrl = article.heroImage
    ? urlFor(article.heroImage).width(1100).auto('format').url()
    : ''
  const heroAlt = escapeAttr(article.heroImage?.alt || '')
  const titleHTML = applyTitleEmphasis(article.title, article.titleEmphasis)
  const breadcrumb = escapeHTML(article.breadcrumbLabel || catLabel)
  const bodyHTML = toHTML(article.body || [], {components: portableTextComponents})

  const authorPhoto = article.author?.photo
    ? `<img src="${urlFor(article.author.photo).width(96).height(96).auto('format').url()}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'" />`
    : ''

  const relatedHTML = relatedArticles.length
    ? relatedArticles
        .map(
          (r) => `<a class="article-card" href="/insights/${r.slug.current}/" style="border-top:0;padding:0;"><div class="meta"><span class="cat">${escapeHTML(CATEGORY_LABELS[r.category] || r.category)}</span><span>&middot; ${r.readTime} min</span></div><h3>${escapeHTML(r.title)}</h3><p>${escapeHTML(r.excerpt)}</p></a>`,
        )
        .join('\n      ')
    : ''

  const P = '/'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHTML(article.title)} — 24 Law Chambers</title>
<meta name="description" content="${escapeAttr(article.excerpt)}" />
<link rel="stylesheet" href="${P}assets/styles.css" />
</head>
<body data-screen-label="08 Article">

${HEADER(P)}

<section class="page-hero" style="border-bottom:0;">
  <div class="wrap" style="max-width:920px;">
    <div class="crumbs reveal"><a href="${P}index.html">Home</a><span class="sep">/</span><a href="${P}insights.html">Insights</a><span class="sep">/</span><span class="here">${breadcrumb}</span></div>
    <div class="reveal" style="display:flex;gap:16px;align-items:center;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:20px;"><span style="color:var(--brass-deep);font-weight:500;">${escapeHTML(catLabel)}</span><span>&middot;</span><span>${dateStr}</span><span>&middot;</span><span>${article.readTime} min read</span></div>
    <h1 class="reveal">${titleHTML}.</h1>
    <p class="lead reveal" style="margin-top:24px;">${escapeHTML(article.excerpt)}</p>
  </div>
</section>

${heroUrl ? `<div class="wrap reveal" style="max-width:1100px;">
  <div class="img-card" style="aspect-ratio:16/9;">
    <img src="${heroUrl}" alt="${heroAlt}" />
  </div>
</div>` : ''}

<section class="section tight">
  <div class="wrap" style="max-width:920px;">
    <div class="reveal" style="font-size:18px;line-height:1.75;color:var(--ink-soft);">
      ${bodyHTML}
    </div>

    <div class="reveal" style="margin-top:64px;border-top:1px solid var(--rule);padding-top:32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;">
      <div style="display:flex;gap:14px;align-items:center;">
        <div style="width:48px;height:48px;border-radius:999px;background:var(--paper-deep);display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:20px;overflow:hidden;">${authorPhoto}</div>
        <div>
          <div style="font-family:var(--display);font-size:18px;font-weight:500;">${escapeHTML(article.author?.name || '')}</div>
          <div class="muted" style="font-size:13px;">${escapeHTML(article.author?.role || '')}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <a class="chip" href="#">Share — LinkedIn</a>
        <a class="chip" href="#">Copy link</a>
      </div>
    </div>
  </div>
</section>

${
  relatedHTML
    ? `<section class="section warm">
  <div class="wrap">
    <h2 class="h2 reveal" style="margin-bottom:32px;">Continue reading</h2>
    <div class="reveal-stagger" style="display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(24px,3vw,48px);">
      ${relatedHTML}
    </div>
  </div>
</section>`
    : ''
}

${FOOTER(P)}

<script src="${P}assets/site.js"></script>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Generate insights.html (listing page)
// ---------------------------------------------------------------------------

function buildInsightsPage(articles) {
  const featured = articles[0]
  const rest = articles.slice(1)

  const featuredCard = featured
    ? `<a class="article-card reveal" href="insights/${featured.slug.current}/" data-cats="${featured.category}" style="border-top:1px solid var(--rule);display:grid;grid-template-columns:1fr 1.4fr;gap:clamp(24px,4vw,56px);align-items:center;padding:40px 0;">
      <div style="aspect-ratio:4/3;background:var(--paper-deep);overflow:hidden;border-radius:2px;">
        ${featured.heroImage ? `<img src="${urlFor(featured.heroImage).width(600).auto('format').url()}" alt="${escapeAttr(featured.heroImage?.alt || '')}" style="width:100%;height:100%;object-fit:cover;" />` : ''}
      </div>
      <div>
        <div class="meta"><span class="cat">${escapeHTML(CATEGORY_LABELS[featured.category] || featured.category)}</span><span>· ${formatDate(featured.publishedAt)}</span><span>· ${featured.readTime} min read</span></div>
        <h3 style="font-size:clamp(28px,2.8vw,44px);">${escapeHTML(featured.title)}</h3>
        <p>${escapeHTML(featured.excerpt)}</p>
        <span class="more">Read More ${ARROW_SVG}</span>
      </div>
    </a>`
    : ''

  const restCards = rest
    .map(
      (a) =>
        `<a class="article-card" href="insights/${a.slug.current}/" data-cats="${a.category}"><div class="meta"><span class="cat">${escapeHTML(CATEGORY_LABELS[a.category] || a.category)}</span><span>· ${a.readTime} min</span><span>· ${formatDate(a.publishedAt)}</span></div><h3>${escapeHTML(a.title)}</h3><p>${escapeHTML(a.excerpt)}</p><span class="more">Read More ${ARROW_SVG}</span></a>`,
    )
    .join('\n      ')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Insights — 24 Law Chambers</title>
<meta name="description" content="Practical legal commentary on public-sector recovery, energy, oil and gas, infrastructure, arbitration, enforcement, insolvency, and Nigeria-UK cross-border legal issues." />
<link rel="stylesheet" href="assets/styles.css" />
</head>
<body data-screen-label="07 Insights">

${HEADER()}

<section class="page-hero">
  <div class="wrap">
    <div class="crumbs reveal"><a href="index.html">Home</a><span class="sep">/</span><span class="here">Insights</span></div>
    <h1 class="reveal">Practical legal <em>commentary.</em></h1>
    <p class="lead reveal">Our insights provide practical legal commentary on public-sector recovery, energy, power, oil and gas, infrastructure, arbitration, enforcement, insolvency, regulated sectors, and Nigeria–UK cross-border legal issues.</p>
  </div>
</section>

<section class="section tight">
  <div class="wrap">
    <div class="reveal" data-filter-group data-filter-target=".article-card" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:48px;">
      <button class="chip active" data-filter="all">All</button>
      <button class="chip" data-filter="public-revenue">Public Revenue</button>
      <button class="chip" data-filter="energy">Energy &amp; Power</button>
      <button class="chip" data-filter="oil-gas">Oil &amp; Gas</button>
      <button class="chip" data-filter="arbitration">Arbitration</button>
      <button class="chip" data-filter="infrastructure">Infrastructure</button>
      <button class="chip" data-filter="regulatory">Regulatory</button>
      <button class="chip" data-filter="cross-border">Nigeria–UK</button>
      <button class="chip" data-filter="insolvency">Insolvency</button>
    </div>

    ${featuredCard}

    <div class="reveal-stagger" style="display:grid;grid-template-columns:repeat(2,1fr);gap:0 clamp(24px,3vw,48px);margin-top:32px;">
      ${restCards}
    </div>
  </div>
</section>

${FOOTER()}

<script src="assets/site.js"></script>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Patch the homepage insights section
// ---------------------------------------------------------------------------

function patchHomepageInsights(articles) {
  const indexPath = resolve(ROOT, 'index.html')
  let html = readFileSync(indexPath, 'utf-8')

  const latest = articles.slice(0, 5)
  if (!latest.length) return

  const featured = latest[0]
  const sidebar = latest.slice(1)

  const featuredCard = `<a class="article-card" href="insights/${featured.slug.current}/" style="border-top:0;">
          <div style="aspect-ratio: 16/9; background: var(--paper-deep); position: relative; overflow: hidden; margin-bottom: 12px; border-radius: 2px;">
            ${featured.heroImage ? `<img src="${urlFor(featured.heroImage).width(800).auto('format').url()}" alt="${escapeAttr(featured.heroImage?.alt || '')}" style="width:100%;height:100%;object-fit:cover;" />` : ''}
          </div>
          <div class="meta"><span class="cat">${escapeHTML(CATEGORY_LABELS[featured.category] || featured.category)}</span><span>· ${featured.readTime} min read</span><span>· ${formatDate(featured.publishedAt)}</span></div>
          <h3 style="font-size: clamp(28px, 2.6vw, 40px);">${escapeHTML(featured.title)}</h3>
          <p>${escapeHTML(featured.excerpt)}</p>
          <span class="more">Read More ${ARROW_SVG}</span>
        </a>`

  const sidebarCards = sidebar
    .map(
      (a) =>
        `<a class="article-card" href="insights/${a.slug.current}/">
          <div class="meta"><span class="cat">${escapeHTML(CATEGORY_LABELS[a.category] || a.category)}</span><span>· ${a.readTime} min</span></div>
          <h3>${escapeHTML(a.title)}</h3>
          <p>${escapeHTML(a.excerpt)}</p>
        </a>`,
    )
    .join('\n        ')

  const newSection = `<!-- ======= INSIGHTS (auto-generated by build-insights) ======= -->
<section class="section">
  <div class="wrap">
    <div class="section-head reveal">
      <div>
        <span class="eyebrow"><span class="num">08</span> Insights</span>
      </div>
      <div>
        <h2 class="h-display">Practical legal <em>commentary.</em></h2>
        <p class="lead" style="margin-top: 28px;">Our insights provide practical legal commentary on public-sector recovery, energy, power, oil and gas, infrastructure, arbitration, enforcement, insolvency, regulated sectors, and Nigeria–UK cross-border legal issues.</p>
      </div>
    </div>

    <div class="reveal-stagger" style="display:grid;grid-template-columns:1.4fr 1fr;gap: clamp(32px, 4vw, 64px);">
      <div>
        ${featuredCard}
      </div>
      <div>
        ${sidebarCards}
      </div>
    </div>

    <div class="reveal" style="display:flex;justify-content:flex-end;margin-top: 40px;">
      <a class="btn-link" href="insights.html">All insights
        <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
    </div>
  </div>`

  const startMarker = /<!-- =+ INSIGHTS[^>]*-->\s*<section class="section">/
  const endMarker = /<\/div>\s*<\/section>\s*(?=\n*(?:<!-- =|<section|<footer))/

  const startMatch = html.match(startMarker)
  if (!startMatch) {
    console.warn('WARNING: Could not find insights section marker in index.html — skipping homepage patch.')
    return
  }

  const startIdx = startMatch.index
  const afterStart = html.slice(startIdx)
  const sectionClose = '</div>\n</section>'
  let depth = 0
  let endIdx = -1
  for (let i = afterStart.indexOf('<section'); i < afterStart.length; i++) {
    if (afterStart.slice(i, i + 8) === '<section') depth++
    if (afterStart.slice(i, i + 10) === '</section>') {
      depth--
      if (depth === 0) {
        endIdx = startIdx + i + 10
        break
      }
    }
  }

  if (endIdx === -1) {
    console.warn('WARNING: Could not find end of insights section in index.html — skipping homepage patch.')
    return
  }

  html = html.slice(0, startIdx) + newSection + '\n</section>' + html.slice(endIdx)
  writeFileSync(indexPath, html, 'utf-8')
  console.log('  ✓ Patched index.html insights section')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Fetching articles from Sanity...')

  const articles = await client.fetch(
    `*[_type == "article"] | order(publishedAt desc) {
      _id,
      title,
      slug,
      category,
      publishedAt,
      readTime,
      heroImage,
      excerpt,
      breadcrumbLabel,
      titleEmphasis,
      body,
      "author": author->{name, role, photo}
    }`,
  )

  console.log(`Found ${articles.length} article(s).`)
  if (!articles.length) {
    console.log('No articles to build. Done.')
    return
  }

  // Ensure output directory exists
  const outDir = resolve(ROOT, 'insights')
  if (!existsSync(outDir)) mkdirSync(outDir, {recursive: true})

  // Build individual article pages
  for (const article of articles) {
    const related = articles
      .filter((a) => a._id !== article._id)
      .slice(0, 3)
    const html = buildArticlePage(article, related)
    const articleDir = resolve(outDir, article.slug.current)
    if (!existsSync(articleDir)) mkdirSync(articleDir, {recursive: true})
    writeFileSync(resolve(articleDir, 'index.html'), html, 'utf-8')
    console.log(`  ✓ insights/${article.slug.current}/index.html`)
  }

  // Build insights listing page
  const listingHTML = buildInsightsPage(articles)
  writeFileSync(resolve(ROOT, 'insights.html'), listingHTML, 'utf-8')
  console.log('  ✓ insights.html')

  // Patch homepage
  patchHomepageInsights(articles)

  console.log(`\nDone! Built ${articles.length} article page(s).`)
}

main().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
