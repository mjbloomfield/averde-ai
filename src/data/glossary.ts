// Single source of truth for glossary terms. Used by /glossary (page +
// DefinedTermSet schema) and by the site-wide hover-tooltip script in
// BaseLayout, which enhances any link pointing at /glossary#<slug>.
// Keep definitions short, concrete, jargon-free.
export type GlossaryTerm = { term: string; slug: string; def: string };

export const terms: GlossaryTerm[] = [
  {
    term: 'AEO (Answer Engine Optimization)',
    slug: 'aeo',
    def: "Writing and structuring a website so AI answer engines — ChatGPT, Perplexity, Google AI Overviews — can cleanly extract, recommend, and cite your business when someone asks them a question.",
  },
  {
    term: 'SEO (Search Engine Optimization)',
    slug: 'seo',
    def: "Optimizing a website to rank in classic search results — Google's list of ten blue links. Still matters, but it's a different game from getting cited inside an AI answer.",
  },
  {
    term: 'AI Overviews',
    slug: 'ai-overviews',
    def: "Google's AI-generated answer that appears above the regular search results. It summarizes an answer and cites a handful of sources — and being one of those sources is the goal.",
  },
  {
    term: 'Answer engine',
    slug: 'answer-engine',
    def: "Any tool that reads the web and answers a question directly instead of handing you a list of links. ChatGPT, Perplexity, and Google AI Overviews are all answer engines.",
  },
  {
    term: 'Schema markup (structured data)',
    slug: 'schema-markup',
    def: "Hidden, machine-readable labels in a page's code that tell search and AI engines exactly what something is — a business, a service, a price, an FAQ — instead of making them guess from the text.",
  },
  {
    term: 'LocalBusiness schema',
    slug: 'localbusiness-schema',
    def: "A specific type of schema markup that describes a business: its name, address, area served, hours, and contact details. It's how AI engines place you on the local map.",
  },
  {
    term: 'FAQ schema',
    slug: 'faq-schema',
    def: "Schema markup that wraps a page's questions and answers so AI engines can lift a direct answer straight from your site and attribute it to you.",
  },
  {
    term: 'LLM (Large Language Model)',
    slug: 'llm',
    def: "The kind of AI behind tools like Claude and ChatGPT. It's trained on huge amounts of text and predicts useful, fluent responses — including which businesses to mention when asked.",
  },
  {
    term: 'AI model',
    slug: 'ai-model',
    def: "One specific version of an AI. Claude's lineup runs Haiku, Sonnet, Opus, and Fable, in increasing capability — the more capable the model, the deeper it thinks and the more tokens it uses.",
  },
  {
    term: 'Tokens',
    slug: 'tokens',
    def: "The units AI models read and write text in — a token is roughly three-quarters of a word. Every question and answer spends tokens, which is why longer tasks and more advanced models use up your plan's allowance faster.",
  },
  {
    term: 'Quota (usage limits)',
    slug: 'quota',
    def: "The cap on how much work your Claude plan can do in a given window. Hit it and you wait for the reset (a few hours) or upgrade your plan. More advanced models burn through it faster.",
  },
  {
    term: 'Connector',
    slug: 'connector',
    def: "A permission you grant Claude to work inside one of your apps — your email, calendar, or files. Like folder access in Cowork, but for your online tools. You choose which apps, and you can disconnect any of them anytime.",
  },
  {
    term: 'Citation network',
    slug: 'citation-network',
    def: "The web of sources AI engines pull from when they build an answer — your site, directories, maps, reviews, and mentions elsewhere. Showing up across it is what gets you recommended.",
  },
  {
    term: 'Google Business Profile (GBP)',
    slug: 'google-business-profile',
    def: "Your free business listing on Google (formerly Google My Business). It feeds the local AI graph, so a complete, accurate profile is one of the highest-leverage local AI moves there is.",
  },
  {
    term: 'AI-Ready Website',
    slug: 'ai-ready-website',
    def: "A site built so AI engines can read it, recommend it, and cite it: AEO content, full schema markup, and presence across the local AI citation network. The flagship Averde AI service.",
  },
];
