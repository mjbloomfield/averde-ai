import type { APIRoute } from 'astro';
import { Resend } from 'resend';

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
