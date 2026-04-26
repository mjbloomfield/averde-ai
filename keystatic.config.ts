import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
  storage: {
    kind: 'cloud',
  },
  cloud: {
    project: 'averde-ai/averde-ai',
  },

  // =============================================
  // COLLECTIONS (repeating content)
  // =============================================
  collections: {
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
        publishedDate: fields.date({
          label: 'Published Date',
        }),
        author: fields.text({
          label: 'Author',
          defaultValue: 'Mark Bloomfield',
        }),
        seoDescription: fields.text({
          label: 'SEO Description',
          description: 'Meta description for search engines (150–160 chars)',
          multiline: true,
        }),
        content: fields.markdoc({
          label: 'Content',
        }),
      },
    }),
  },

  // =============================================
  // SINGLETONS (one-off page content)
  // =============================================
  singletons: {
    home: singleton({
      label: 'Homepage',
      path: 'src/content/pages/home',
      schema: {
        // Hero
        heroEyebrow:          fields.text({ label: 'Eyebrow', defaultValue: 'Free 30-min AI audit · No jargon' }),
        heroHeadlineStart:    fields.text({ label: 'Headline — start', defaultValue: 'AI for small business, explained by someone who' }),
        heroHeadlineEmphasis: fields.text({ label: 'Headline — italic emphasis', defaultValue: 'actually runs one.' }),
        heroSubheadline:      fields.text({ label: 'Subheadline', multiline: true }),
        heroPrimaryCta:       fields.text({ label: 'Primary CTA label', defaultValue: 'Get my free AI audit' }),
        heroSecondaryCta:     fields.text({ label: 'Secondary CTA label', defaultValue: 'See what we do →' }),
        heroMeta:             fields.text({ label: 'Trust line', defaultValue: 'Live in 5 business days · 30-day money-back · Boulder, CO' }),

        // What we do — section header
        pillarsEyebrow:  fields.text({ label: 'Pillars — eyebrow', defaultValue: 'What we do' }),
        pillarsHeadline: fields.text({ label: 'Pillars — headline', defaultValue: 'Three ways we help your business put AI to work.' }),
        pillarsDek:      fields.text({ label: 'Pillars — subheadline', multiline: true }),

        // Pillar 1
        pillar1Title:    fields.text({ label: 'Pillar 1 — title', defaultValue: 'Learn AI' }),
        pillar1Body:     fields.text({ label: 'Pillar 1 — body', multiline: true }),
        pillar1Services: fields.array(fields.text({ label: 'Service' }), { label: 'Pillar 1 — services list' }),

        // Pillar 2
        pillar2Title:    fields.text({ label: 'Pillar 2 — title', defaultValue: 'Deploy AI Tools' }),
        pillar2Body:     fields.text({ label: 'Pillar 2 — body', multiline: true }),
        pillar2Services: fields.array(fields.text({ label: 'Service' }), { label: 'Pillar 2 — services list' }),

        // Pillar 3
        pillar3Title:    fields.text({ label: 'Pillar 3 — title', defaultValue: 'Build Custom AI' }),
        pillar3Body:     fields.text({ label: 'Pillar 3 — body', multiline: true }),
        pillar3Services: fields.array(fields.text({ label: 'Service' }), { label: 'Pillar 3 — services list' }),

        // Voice agent strip
        voiceEyebrow:    fields.text({ label: 'Voice strip — eyebrow' }),
        voiceHeadline:   fields.text({ label: 'Voice strip — headline', defaultValue: 'Never miss another call.' }),
        voiceBody:       fields.text({ label: 'Voice strip — body', multiline: true }),
        voicePrimaryCta: fields.text({ label: 'Voice strip — CTA label', defaultValue: 'See how it works' }),

        // Process
        processEyebrow:  fields.text({ label: 'Process — eyebrow', defaultValue: 'How we work' }),
        processHeadline: fields.text({ label: 'Process — headline', multiline: true }),
        step1Title: fields.text({ label: 'Step 1 — title', defaultValue: 'Free AI audit' }),
        step1Body:  fields.text({ label: 'Step 1 — body', multiline: true }),
        step2Title: fields.text({ label: 'Step 2 — title', defaultValue: 'We build & deploy' }),
        step2Body:  fields.text({ label: 'Step 2 — body', multiline: true }),
        step3Title: fields.text({ label: 'Step 3 — title', defaultValue: 'You get results' }),
        step3Body:  fields.text({ label: 'Step 3 — body', multiline: true }),

        // Industries
        industriesEyebrow:  fields.text({ label: 'Industries — eyebrow', defaultValue: 'Built for' }),
        industriesHeadline: fields.text({ label: 'Industries — headline', defaultValue: 'Service businesses with their own rhythms.' }),
        industriesDek:      fields.text({ label: 'Industries — subheadline', multiline: true }),
        dentalTitle:        fields.text({ label: 'Dental — title', defaultValue: 'Dental practices' }),
        dentalDesc:         fields.text({ label: 'Dental — description', multiline: true }),
        hvacTitle:          fields.text({ label: 'HVAC — title', defaultValue: 'HVAC & contractors' }),
        hvacDesc:           fields.text({ label: 'HVAC — description', multiline: true }),
        realEstateTitle:    fields.text({ label: 'Real estate — title', defaultValue: 'Real estate agents' }),
        realEstateDesc:     fields.text({ label: 'Real estate — description', multiline: true }),

        // Testimonial
        quoteText: fields.text({ label: 'Testimonial — quote', multiline: true }),
        quoteName: fields.text({ label: 'Testimonial — name', defaultValue: 'Dr. Priya Ramanathan' }),
        quoteRole: fields.text({ label: 'Testimonial — role', defaultValue: 'Owner · Harbor Dental · Boulder, CO' }),

        // Final CTA
        ctaHeadline:    fields.text({ label: 'Final CTA — headline', multiline: true }),
        ctaDek:         fields.text({ label: 'Final CTA — subheadline', multiline: true }),
        ctaPrimaryCta:  fields.text({ label: 'Final CTA — button label', defaultValue: 'Book your free AI audit' }),
        ctaMicro:       fields.text({ label: 'Final CTA — micro text', defaultValue: 'No commitment · No credit card · Just clarity' }),
      },
    }),

    settings: singleton({
      label: 'Site Settings',
      path: 'src/content/settings',
      schema: {
        phone: fields.text({ label: 'Phone Number', defaultValue: '' }),
        email: fields.text({ label: 'Contact Email', defaultValue: 'mark@averde.ai' }),
        bookingUrl: fields.url({ label: 'Booking URL (TidyCal)', validation: { isRequired: false } }),
        starterPrice: fields.text({ label: 'Starter Price', defaultValue: '$297' }),
        growthPrice: fields.text({ label: 'Growth Price', defaultValue: '$497' }),
        proPrice: fields.text({ label: 'Pro Price', defaultValue: '$797' }),
        heroHeadline: fields.text({
          label: 'Homepage Hero Headline',
          defaultValue: 'Your business answers every call. Even when you can\'t.',
        }),
        heroSubheadline: fields.text({
          label: 'Homepage Hero Subheadline',
          multiline: true,
          defaultValue: 'Averde AI deploys voice agents that answer calls, book appointments, and handle emergencies 24/7 — so you never lose another customer to voicemail.',
        }),
      },
    }),
  },
});
