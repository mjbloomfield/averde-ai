import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

// All anti-spam drops return success-looking redirects so bots don't
// retry with different evasion tactics.
const silentDrop = () =>
  new Response(null, { status: 302, headers: { Location: '/contact?sent=1' } });

// Looks like a URL or domain. Used to reject the name/company fields,
// which legitimate users almost never put URLs in.
const URL_PATTERN = /https?:\/\/|\bwww\.|\b[a-z0-9.-]+\.(com|net|org|io|ai|co|biz|info|xyz|top|click|link|shop|cn|ru)\b/i;

// Origins we accept submissions from. Subdomains of averde.ai allowed.
const ALLOWED_ORIGINS = [
  'https://averde.ai',
  'https://www.averde.ai',
  'http://127.0.0.1:4321',
  'http://localhost:4321',
];

function originIsTrusted(origin: string): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(o => origin.startsWith(o)) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app(\/|$)/.test(origin); // preview deploys
}

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  const name = data.get('name')?.toString().trim() || '';
  const email = data.get('email')?.toString().trim() || '';
  const company = data.get('company')?.toString().trim() || '';
  const message = data.get('message')?.toString().trim() || '';

  // ── Anti-spam layer ─────────────────────────────────────────────

  // 1. Honeypot — hidden form field. Real users can't see it; bots fill it.
  const honeypot = data.get('website')?.toString().trim() || '';
  if (honeypot) return silentDrop();

  // 2. Time-to-submit — JS sets this on page load. Missing or sub-2s = bot.
  const startedAt = Number(data.get('t')) || 0;
  const elapsed = Date.now() - startedAt;
  if (!startedAt || elapsed < 2000 || elapsed > 60 * 60 * 1000) return silentDrop();

  // 3. Origin / Referer must be averde.ai (or a vercel preview, or localhost).
  const origin = request.headers.get('origin') || request.headers.get('referer') || '';
  if (!originIsTrusted(origin)) return silentDrop();

  // 4. URL in name or company — almost always spam (e.g. "Name: The balance is...").
  if (URL_PATTERN.test(name) || URL_PATTERN.test(company)) return silentDrop();

  // ── Standard validation ────────────────────────────────────────
  if (!name || !email || !message) {
    return new Response(null, { status: 302, headers: { Location: '/contact?error=missing' } });
  }

  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(null, { status: 302, headers: { Location: '/contact?error=config' } });
  }

  const subject = `averde.ai contact: ${name}${company ? ` — ${company}` : ''}`;
  const text = `Name: ${name}\nEmail: ${email}${company ? `\nCompany: ${company}` : ''}\n\n${message}`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: 'Averde AI Website <mark@averde.ai>',
      to: ['mark@averde.ai'],
      replyTo: email,
      subject,
      text,
    });

    if (error) {
      return new Response(null, { status: 302, headers: { Location: '/contact?error=send' } });
    }
  } catch {
    return new Response(null, { status: 302, headers: { Location: '/contact?error=send' } });
  }

  return new Response(null, { status: 302, headers: { Location: '/contact?sent=1' } });
};
