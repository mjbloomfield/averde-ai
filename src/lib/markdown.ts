// Inline-markdown renderer for CMS text fields (playbook Appendix E pattern):
// supports **bold**, *italic*, and [text](url); HTML-escapes everything else.
// Usage: <p set:html={renderInlineMarkdown(field)} />
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function renderInlineMarkdown(md: string): string {
  let out = escapeHtml(md);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}
