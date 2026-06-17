import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    category: z.string(),
    publishedDate: z.coerce.string().optional(),
    author: z.string().default('Mark Bloomfield'),
    seoDescription: z.string().optional(),
  }),
});

const industries = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/industries' }),
  schema: z.object({
    name: z.string(),
    published: z.boolean().default(true),
    seoTitle: z.string(),
    seoDescription: z.string(),
    heroEyebrow: z.string(),
    heroHeadline: z.string(),
    heroDek: z.string(),
    heroCta: z.string().default('Get My Free Missed Call Audit'),
    painHeadline: z.string(),
    painPoints: z.array(z.object({ pain: z.string(), result: z.string() })),
    solutionHeadline: z.string(),
    solutionDek: z.string(),
    capabilities: z.array(z.string()),
    roiHeadline: z.string(),
    roiBody: z.string(),
    roiStats: z.array(z.object({ stat: z.string(), label: z.string() })).default([]),
    ctaHeadline: z.string(),
    ctaDek: z.string(),
  }),
});

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/case-studies' }),
  schema: z.object({
    client: z.string(),
    published: z.boolean().default(true),
    order: z.number().default(0),
    industry: z.string(),
    location: z.string(),
    seoTitle: z.string(),
    seoDescription: z.string(),
    cardSummary: z.string(),
    oldUrl: z.string(),
    oldPlatform: z.string(),
    liveUrl: z.string(),
    newPlatform: z.string(),
    heroEyebrow: z.string(),
    heroHeadline: z.string(),
    heroDek: z.string(),
    scores: z.array(z.object({
      label: z.string(),
      sublabel: z.string(),
      before: z.number(),
      after: z.number(),
    })),
    metrics: z.array(z.object({
      label: z.string(),
      before: z.string(),
      after: z.string(),
    })),
    challengeHeadline: z.string(),
    challengeBody: z.array(z.string()),
    approachHeadline: z.string(),
    approach: z.array(z.object({ title: z.string(), body: z.string() })),
    featuresHeadline: z.string(),
    features: z.array(z.string()),
    methodologyNote: z.string(),
  }),
});

export const collections = { blog, industries, caseStudies };
