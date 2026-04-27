import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  const name = data.get('name')?.toString().trim() || '';
  const email = data.get('email')?.toString().trim() || '';
  const company = data.get('company')?.toString().trim() || '';
  const message = data.get('message')?.toString().trim() || '';

  if (!name || !email || !message) {
    return new Response(null, { status: 302, headers: { Location: '/contact?error=missing' } });
  }

  const apiKey = import.meta.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return new Response(null, { status: 302, headers: { Location: '/contact?error=config' } });
  }

  const subject = `averde.ai contact: ${name}${company ? ` — ${company}` : ''}`;
  const text = `Name: ${name}\nEmail: ${email}${company ? `\nCompany: ${company}` : ''}\n\n${message}`;

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: 'mark@averde.ai', name: 'Mark Bloomfield' }] }],
        from: { email: 'mark@averde.ai', name: 'Averde AI Website' },
        reply_to: { email, name },
        subject,
        content: [{ type: 'text/plain', value: text }],
      }),
    });

    if (!res.ok) {
      return new Response(null, { status: 302, headers: { Location: '/contact?error=send' } });
    }
  } catch {
    return new Response(null, { status: 302, headers: { Location: '/contact?error=send' } });
  }

  return new Response(null, { status: 302, headers: { Location: '/contact?sent=1' } });
};
