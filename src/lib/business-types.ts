// Small-business classification for the readiness audit.
//
// The type list is curated from NAICS — the sector taxonomy the SBA and
// Census business surveys use — trimmed to the ~55 types that actually show
// up as small businesses, with friendlier labels. Each type maps to one of
// the four question buckets from CLAUDE.md's "segment before you ask" rule:
//   appointment  — solo/small practitioners who book sessions
//   project      — quote-and-build businesses
//   retail       — shops, e-commerce, food
//   professional — advice/document businesses
export type Bucket = 'appointment' | 'project' | 'retail' | 'professional';

export const BUSINESS_TYPES: Array<{ label: string; naics: string; bucket: Bucket }> = [
  // Appointment-based practitioners (NAICS 62 health care, 81 personal services, 71 fitness, 61 education)
  { label: 'Massage therapy / bodywork', naics: '6213', bucket: 'appointment' },
  { label: 'Therapist / counseling practice', naics: '6213', bucket: 'appointment' },
  { label: 'Chiropractic office', naics: '6213', bucket: 'appointment' },
  { label: 'Dental practice', naics: '6212', bucket: 'appointment' },
  { label: 'Medical clinic / private practice', naics: '6211', bucket: 'appointment' },
  { label: 'Physical therapy / rehab', naics: '6213', bucket: 'appointment' },
  { label: 'Acupuncture / alternative medicine', naics: '6213', bucket: 'appointment' },
  { label: 'Med spa / aesthetics', naics: '8121', bucket: 'appointment' },
  { label: 'Hair salon / barbershop', naics: '8121', bucket: 'appointment' },
  { label: 'Nail salon / spa', naics: '8121', bucket: 'appointment' },
  { label: 'Veterinary clinic', naics: '5419', bucket: 'appointment' },
  { label: 'Pet grooming / boarding', naics: '8129', bucket: 'appointment' },
  { label: 'Fitness studio / gym', naics: '7139', bucket: 'appointment' },
  { label: 'Yoga / pilates studio', naics: '7139', bucket: 'appointment' },
  { label: 'Personal training', naics: '7139', bucket: 'appointment' },
  { label: 'Coaching (life, business, career)', naics: '6116', bucket: 'appointment' },
  { label: 'Tutoring / lessons', naics: '6116', bucket: 'appointment' },
  { label: 'Photography / videography', naics: '5419', bucket: 'appointment' },
  { label: 'Childcare / daycare', naics: '6244', bucket: 'appointment' },

  // Project / quote businesses (NAICS 23 construction, 56 services, 54 creative/technical)
  { label: 'General contractor / remodeling', naics: '2361', bucket: 'project' },
  { label: 'Plumbing', naics: '2382', bucket: 'project' },
  { label: 'HVAC', naics: '2382', bucket: 'project' },
  { label: 'Electrical', naics: '2382', bucket: 'project' },
  { label: 'Roofing / siding', naics: '2381', bucket: 'project' },
  { label: 'Painting / flooring / finish work', naics: '2383', bucket: 'project' },
  { label: 'Handyman services', naics: '2389', bucket: 'project' },
  { label: 'Landscaping / lawn care', naics: '5617', bucket: 'project' },
  { label: 'Cleaning services', naics: '5617', bucket: 'project' },
  { label: 'Pest control', naics: '5617', bucket: 'project' },
  { label: 'Moving / hauling', naics: '4842', bucket: 'project' },
  { label: 'Auto repair / body shop', naics: '8111', bucket: 'project' },
  { label: 'Custom fabrication (awnings, signs, cabinets, welding)', naics: '3323', bucket: 'project' },
  { label: 'Marketing / creative agency', naics: '5418', bucket: 'project' },
  { label: 'Web / software development studio', naics: '5415', bucket: 'project' },
  { label: 'IT services / managed IT', naics: '5415', bucket: 'project' },
  { label: 'Event planning', naics: '8129', bucket: 'project' },
  { label: 'Catering', naics: '7223', bucket: 'project' },

  // Retail / e-commerce / food (NAICS 44-45 retail, 72 food service)
  { label: 'Retail shop (brick & mortar)', naics: '44-45', bucket: 'retail' },
  { label: 'E-commerce / online store', naics: '4551', bucket: 'retail' },
  { label: 'Boutique / specialty goods', naics: '4585', bucket: 'retail' },
  { label: 'Florist', naics: '4593', bucket: 'retail' },
  { label: 'Restaurant / cafe', naics: '7225', bucket: 'retail' },
  { label: 'Bakery', naics: '7225', bucket: 'retail' },
  { label: 'Bar / brewery / taproom', naics: '7224', bucket: 'retail' },
  { label: 'Food truck', naics: '7225', bucket: 'retail' },

  // Professional / advice businesses (NAICS 52-54 finance, real estate, professional)
  { label: 'Law firm', naics: '5411', bucket: 'professional' },
  { label: 'Accounting / bookkeeping / tax', naics: '5412', bucket: 'professional' },
  { label: 'Financial advisor / planner', naics: '5239', bucket: 'professional' },
  { label: 'Insurance agency', naics: '5242', bucket: 'professional' },
  { label: 'Real estate agent / brokerage', naics: '5312', bucket: 'professional' },
  { label: 'Property management', naics: '5313', bucket: 'professional' },
  { label: 'Mortgage / title services', naics: '5223', bucket: 'professional' },
  { label: 'Architecture / engineering', naics: '5413', bucket: 'professional' },
  { label: 'Business consulting', naics: '5416', bucket: 'professional' },
  { label: 'Recruiting / staffing', naics: '5613', bucket: 'professional' },
  { label: 'Nonprofit / association', naics: '8134', bucket: 'professional' },
];

export function bucketFor(label: string): Bucket | null {
  const hit = BUSINESS_TYPES.find(t => t.label.toLowerCase() === label.trim().toLowerCase());
  return hit ? hit.bucket : null;
}

// Keyword fallback when the LLM is unavailable or returns something off-list.
export function keywordClassify(description: string): { label: string; bucket: Bucket } {
  const d = description.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/massage|bodywork|therap|counsel|chiro|acupunct|dental|dentist|clinic|salon|barber|spa|aesthet|vet|groom|gym|fitness|yoga|pilates|train(er|ing)|coach|tutor|photograph|childcare|daycare/, 'appointment'],
    [/law|attorney|legal|account|bookkeep|tax|cpa|financ|advisor|insur|real estate|realtor|broker|property manage|mortgage|title|architect|engineer|consult|recruit|staffing|nonprofit/, 'professional'],
    [/shop|store|retail|boutique|e-?commerce|online store|florist|restaurant|cafe|coffee|bakery|brewery|bar\b|taproom|food truck|deli/, 'retail'],
    [/contract|remodel|plumb|hvac|heating|cooling|electric|roof|siding|paint|floor|handyman|landscap|lawn|clean|pest|moving|haul|auto|body shop|fabricat|awning|sign|cabinet|weld|agency|web|software|developer|it service|event|cater/, 'project'],
  ];
  for (const [re, bucket] of rules) {
    if (re.test(d)) return { label: 'Small business', bucket: bucket as Bucket };
  }
  return { label: 'Small business', bucket: 'project' };
}
