import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

const SITE = 'https://averde.ai';

// Static routes — manually curated so we can set per-page priority and
// freshness signals (Perplexity and Google AI Overviews both weight these).
const staticRoutes: Array<{ path: string; priority: number; changefreq: string }> = [
  { path: '/',             priority: 1.0, changefreq: 'weekly' },
  { path: '/ai-audit',     priority: 0.95, changefreq: 'monthly' },
  { path: '/how-it-works', priority: 0.85, changefreq: 'monthly' },
  { path: '/pricing',      priority: 0.85, changefreq: 'monthly' },
  { path: '/about',        priority: 0.7,  changefreq: 'monthly' },
  { path: '/contact',      priority: 0.7,  changefreq: 'monthly' },
  { path: '/blog',         priority: 0.7,  changefreq: 'weekly' },
  { path: '/privacy',      priority: 0.2,  changefreq: 'yearly' },
];

export const GET: APIRoute = async () => {
  const now = new Date().toISOString();

  const industries = await getCollection('industries');
  const industryRoutes = industries
    .filter(i => i.data.published !== false)
    .map(i => ({
      path: `/industries/${i.id}`,
      priority: 0.8,
      changefreq: 'monthly',
      lastmod: now,
    }));

  const posts = await getCollection('blog');
  const postRoutes = posts.map(p => ({
    path: `/blog/${p.slug}`,
    priority: 0.6,
    changefreq: 'monthly',
    lastmod: p.data.publishedDate || now,
  }));

  const allRoutes = [
    ...staticRoutes.map(r => ({ ...r, lastmod: now })),
    ...industryRoutes,
    ...postRoutes,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    r => `  <url>
    <loc>${SITE}${r.path}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(2)}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
