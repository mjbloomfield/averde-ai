import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
  storage: {
    kind: 'github',
    repo: {
      owner: process.env.GITHUB_OWNER as string,
      name: 'averde-ai',
    },
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
