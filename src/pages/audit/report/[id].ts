import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

// Serves the stored web copy of an emailed AI Visibility Report.
// Rows are written by /api/audit-lead; the unguessable UUID is the
// only access control, so keep these pages out of search indexes.
export const GET: APIRoute = async ({ params }) => {
  const id = params.id || '';
  const notFound = new Response('Report not found', { status: 404 });

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return notFound;

  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return notFound;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from('audit_reports').select('html').eq('id', id).single();
  if (error || !data?.html) return notFound;

  return new Response(data.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'private, max-age=0',
    },
  });
};
