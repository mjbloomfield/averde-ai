import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
  storage: {
    kind: 'cloud',
  },
  cloud: {
    project: 'averde-ai/averde-ai',
  },

  collections: {

    // ── INDUSTRY PAGES ────────────────────────────────────────────────────────
    industries: collection({
      label: 'Industry Pages',
      slugField: 'name',
      path: 'src/content/industries/*',
      format: { data: 'yaml' },
      schema: {
        name: fields.slug({ name: { label: 'Industry name (also used in URL)' } }),
        published: fields.checkbox({ label: 'Published (visible on site)', defaultValue: true }),
        seoTitle: fields.text({ label: 'SEO page title' }),
        seoDescription: fields.text({ label: 'SEO meta description', multiline: true }),
        heroEyebrow: fields.text({ label: 'Hero — eyebrow tag', description: 'e.g. "For Dental Practices"' }),
        heroHeadline: fields.text({ label: 'Hero — headline', multiline: true }),
        heroDek: fields.text({ label: 'Hero — subheadline', multiline: true }),
        heroCta: fields.text({ label: 'Hero — CTA button label', defaultValue: 'Get My Free Missed Call Audit' }),
        painHeadline: fields.text({ label: 'Pain section — headline' }),
        painPoints: fields.array(
          fields.object({
            pain: fields.text({ label: 'Problem' }),
            result: fields.text({ label: 'Consequence / impact', multiline: true }),
          }),
          {
            label: 'Pain points',
            itemLabel: props => props.fields.pain.value || 'New pain point',
          }
        ),
        solutionHeadline: fields.text({ label: 'Solution section — headline' }),
        solutionDek: fields.text({ label: 'Solution section — subheadline', multiline: true }),
        capabilities: fields.array(
          fields.text({ label: 'Capability' }),
          {
            label: 'What the AI does — capability list',
            itemLabel: props => props.value || 'New capability',
          }
        ),
        roiHeadline: fields.text({ label: 'ROI section — headline', multiline: true }),
        roiBody: fields.text({ label: 'ROI section — body text', multiline: true }),
        roiStats: fields.array(
          fields.object({
            stat: fields.text({ label: 'Statistic (e.g. "15" or "×$250")' }),
            label: fields.text({ label: 'Label (e.g. "missed calls/day")' }),
          }),
          {
            label: 'ROI stats grid (leave empty for text-only layout)',
            itemLabel: props => `${props.fields.stat.value} — ${props.fields.label.value}`,
          }
        ),
        ctaHeadline: fields.text({ label: 'Bottom CTA — headline' }),
        ctaDek: fields.text({ label: 'Bottom CTA — paragraph', multiline: true }),
      },
    }),

    blog: collection({
      label: 'Blog Posts',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        excerpt: fields.text({
          label: 'Excerpt',
          description: 'Short summary shown on the blog index page',
          multiline: true,
        }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Voice AI', value: 'Voice AI' },
            { label: 'Pricing', value: 'Pricing' },
            { label: 'Dental', value: 'Dental' },
            { label: 'HVAC', value: 'HVAC' },
            { label: 'Plumbing', value: 'Plumbing' },
            { label: 'Real Estate', value: 'Real Estate' },
            { label: 'Automation', value: 'Automation' },
            { label: 'Case Study', value: 'Case Study' },
          ],
          defaultValue: 'Voice AI',
        }),
        publishedDate: fields.date({ label: 'Published Date' }),
        author: fields.text({ label: 'Author', defaultValue: 'Mark Bloomfield' }),
        seoDescription: fields.text({
          label: 'SEO Description',
          description: 'Meta description for search engines (150–160 chars)',
          multiline: true,
        }),
        content: fields.markdoc({ label: 'Content' }),
      },
    }),
  },

  singletons: {

    // ── HOMEPAGE ──────────────────────────────────────────────────────────────
    home: singleton({
      label: 'Homepage',
      path: 'src/content/pages/home',
      schema: {

        // Hero
        heroEyebrow: fields.text({
          label: 'Hero — location/eyebrow tag',
          defaultValue: 'Boulder, CO · Serving businesses nationwide',
        }),
        heroHeadline: fields.text({
          label: 'Hero — headline (first line)',
          defaultValue: 'Your Personal',
        }),
        heroHeadlineEmphasis: fields.text({
          label: 'Hero — headline emphasis (italic, second line)',
          defaultValue: 'AI Guy.',
        }),
        heroSub: fields.text({
          label: 'Hero — subheadline paragraph',
          multiline: true,
          defaultValue: "I'm Mark Bloomfield — engineer, founder, and the person who explains AI to small businesses without the jargon or the hype. I help you figure out what's real, what's worth it, and how to actually make it work for you.",
        }),
        heroPrimaryCta: fields.text({
          label: 'Hero — primary button label',
          defaultValue: 'Get my free AI audit',
        }),
        heroSecondaryCta: fields.text({
          label: 'Hero — secondary button label',
          defaultValue: 'See free resources →',
        }),
        heroCardItems: fields.array(
          fields.text({ label: 'Bullet point' }),
          {
            label: 'Hero card — "What I do" bullets',
            itemLabel: props => props.value || 'New item',
          }
        ),

        // Free Tools section
        toolsEyebrow: fields.text({
          label: 'Free tools — eyebrow',
          defaultValue: 'Start here — no cost',
        }),
        toolsHeadline: fields.text({
          label: 'Free tools — headline',
          defaultValue: 'Free tools to get you oriented.',
        }),
        toolsDek: fields.text({
          label: 'Free tools — subheadline',
          multiline: true,
          defaultValue: "Not ready to buy anything yet? Good. These free resources will show you exactly where AI can help your business — and where it can't.",
        }),
        tools: fields.array(
          fields.object({
            published: fields.checkbox({ label: 'Visible on site', defaultValue: true }),
            icon: fields.select({
              label: 'Icon',
              options: [
                { label: 'Clock', value: 'clock' },
                { label: 'Checklist', value: 'checklist' },
                { label: 'Calculator', value: 'calculator' },
                { label: 'Phone', value: 'phone' },
                { label: 'Chart', value: 'chart' },
                { label: 'Star', value: 'star' },
              ],
              defaultValue: 'clock',
            }),
            tag: fields.text({ label: 'Tag (e.g. "30-min call · Free")' }),
            title: fields.text({ label: 'Tool name' }),
            description: fields.text({ label: 'Description', multiline: true }),
            ctaLabel: fields.text({ label: 'Link label' }),
            ctaHref: fields.text({ label: 'Link URL' }),
          }),
          {
            label: 'Free tools cards',
            itemLabel: props => `${props.fields.published.value ? '✓' : '○'} ${props.fields.title.value || 'New tool'}`,
          }
        ),

        // Services ladder
        servicesEyebrow: fields.text({
          label: 'Services — eyebrow',
          defaultValue: 'Ready to go deeper',
        }),
        servicesHeadline: fields.text({
          label: 'Services — headline',
          defaultValue: "When you're ready to actually build something.",
        }),
        servicesDek: fields.text({
          label: 'Services — subheadline',
          multiline: true,
          defaultValue: 'From a focused strategy session to a full custom AI build — I work with you directly, at every stage.',
        }),
        services: fields.array(
          fields.object({
            published:   fields.checkbox({ label: 'Visible on site', defaultValue: true }),
            title:       fields.text({ label: 'Service title' }),
            price:       fields.text({ label: 'Price' }),
            description: fields.text({ label: 'Description', multiline: true }),
            ctaLabel:    fields.text({ label: 'Button label' }),
            ctaHref:     fields.text({ label: 'Button link' }),
          }),
          {
            label: 'Services ladder (steps 2 – 5)',
            itemLabel: props =>
              `${props.fields.published.value ? '✓' : '○'} ${props.fields.title.value || 'Untitled'} — ${props.fields.price.value || ''}`,
          }
        ),

        // Testimonial
        quoteText: fields.text({
          label: 'Testimonial — quote text',
          multiline: true,
          defaultValue: '"Mark set up our voice agent in four days. It books as many appointments in a weekend as my front desk used to handle in a week — and it\'s cheaper than one hour of my time."',
        }),
        quoteName: fields.text({
          label: 'Testimonial — person name',
          defaultValue: 'Dr. Priya Ramanathan',
        }),
        quoteRole: fields.text({
          label: 'Testimonial — role / company',
          defaultValue: 'Owner · Harbor Dental · Boulder, CO',
        }),

        // About Mark
        aboutEyebrow: fields.text({
          label: 'About — eyebrow',
          defaultValue: 'Why work with me',
        }),
        aboutHeadline: fields.text({
          label: 'About — headline',
          defaultValue: "I'm not a consultant who learned AI last year.",
        }),
        aboutBio1: fields.text({
          label: 'About — first bio paragraph',
          multiline: true,
          defaultValue: 'I spent years as a composites research engineer and sustainability consultant before the AI wave hit. When I saw what it could do for small businesses — not the hype, the actual practical tools — I built Averde to make it accessible.',
        }),
        aboutBio2: fields.text({
          label: 'About — second bio paragraph',
          multiline: true,
          defaultValue: "Every client works directly with me. I figure out what you actually need, skip the things you don't, and build or deploy it fast. Based in Boulder, CO. Working with businesses everywhere.",
        }),

        // Final CTA
        ctaHeadline: fields.text({
          label: 'Final CTA — headline',
          multiline: true,
          defaultValue: "Not sure where AI fits?\nStart with the free audit.",
        }),
        ctaDek: fields.text({
          label: 'Final CTA — subheadline',
          multiline: true,
          defaultValue: "30 minutes. I'll map out exactly where AI can help your specific business, what it costs, and what to realistically expect. No jargon. No pressure.",
        }),
        ctaButton: fields.text({
          label: 'Final CTA — button label',
          defaultValue: 'Book your free AI audit',
        }),
        ctaMicro: fields.text({
          label: 'Final CTA — micro text below button',
          defaultValue: 'No commitment · No credit card · Just clarity',
        }),
      },
    }),

    // ── ABOUT PAGE ───────────────────────────────────────────────────────────
    about: singleton({
      label: 'About Page',
      path: 'src/content/pages/about',
      schema: {
        heroHeadline: fields.text({
          label: 'Hero — headline',
          defaultValue: 'Engineer. Founder. Your personal AI guy.',
        }),
        heroDek: fields.text({
          label: 'Hero — subheadline',
          multiline: true,
          defaultValue: "I don't do jargon. I don't do hype. I help small businesses figure out what AI is actually worth doing — and then I build it.",
        }),
        bioIntro: fields.text({
          label: 'Bio — intro paragraph',
          multiline: true,
        }),
        bioBackground: fields.text({
          label: 'Bio — background / career paragraph',
          multiline: true,
        }),
        bioApproach: fields.text({
          label: 'Bio — approach / how I work paragraph',
          multiline: true,
        }),
        values: fields.array(
          fields.object({
            title:       fields.text({ label: 'Value title' }),
            description: fields.text({ label: 'Description' }),
          }),
          {
            label: 'Core values',
            itemLabel: props => props.fields.title.value || 'New value',
          }
        ),
      },
    }),

    // ── PRICING PAGE ─────────────────────────────────────────────────────────
    pricing: singleton({
      label: 'Pricing Page',
      path: 'src/content/pages/pricing',
      schema: {
        heroHeadline: fields.text({
          label: 'Hero — headline',
          defaultValue: 'Simple, honest pricing.',
        }),
        heroDek: fields.text({
          label: 'Hero — subheadline',
          multiline: true,
          defaultValue: 'Start free. Step up when you need more.',
        }),
        plans: fields.array(
          fields.object({
            name:        fields.text({ label: 'Plan name' }),
            price:       fields.text({ label: 'Price (e.g. $297/mo)' }),
            description: fields.text({ label: 'Short description', multiline: true }),
            features: fields.array(
              fields.text({ label: 'Feature' }),
              {
                label: 'Feature list',
                itemLabel: props => props.value || 'New feature',
              }
            ),
            ctaLabel: fields.text({ label: 'Button label' }),
            featured:    fields.checkbox({ label: 'Featured / highlighted plan', defaultValue: false }),
          }),
          {
            label: 'Pricing plans',
            itemLabel: props =>
              `${props.fields.name.value || 'Plan'} — ${props.fields.price.value || ''}`,
          }
        ),
      },
    }),

    // ── SITE SETTINGS ─────────────────────────────────────────────────────────
    settings: singleton({
      label: 'Site Settings',
      path: 'src/content/settings',
      schema: {
        email:      fields.text({ label: 'Contact email', defaultValue: 'mark@averde.ai' }),
        phone:      fields.text({ label: 'Phone number', defaultValue: '' }),
        bookingUrl: fields.url({
          label: 'Booking URL (TidyCal / Calendly)',
          validation: { isRequired: false },
        }),
        location:   fields.text({ label: 'Location', defaultValue: 'Boulder, CO' }),
      },
    }),
  },
});
