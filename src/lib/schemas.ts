import { z } from 'zod';

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');

export const StateSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z-]*$/),
  name: z.string().min(2),
  target_keyword: z.string().min(3),
  portals: z.array(z.object({
    label: z.string().min(2),
    url: z.string().url(),
    scope: z.enum(['check', 'pay', 'both'])
  })).min(1),
  check_steps: z.array(z.string().min(10)).min(3),
  pay_steps: z.array(z.string().min(10)).min(3),
  sms_app_methods: z.array(z.string().min(5)),
  court_challan_process: z.string().min(100),
  payment_methods: z.array(z.string().min(2)).min(1),
  contacts: z.array(z.object({ label: z.string(), value: z.string() })),
  quirks: z.array(z.string()),
  faqs: z.array(z.object({ q: z.string().min(8), a: z.string().min(40) })).min(3),
  fine_overrides: z.record(z.string(), z.object({
    amount_text: z.string().min(2),
    source: z.string().url()
  })).default({}),
  sources: z.array(z.string().url()).min(1),
  last_verified: isoDate
});
export type StateRecord = z.infer<typeof StateSchema>;

export const OffenceSchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(3),
  target_keyword: z.string().min(3),
  mva_section: z.string().min(5),
  description: z.string().min(80),
  base_fine_text: z.string().min(2),
  base_fine_min: z.number().int().nonnegative(),
  base_fine_max: z.number().int().nonnegative(),
  repeat_fine_text: z.string().min(2),
  licence_impact: z.string().min(5),
  compoundable_online: z.boolean(),
  faqs: z.array(z.object({ q: z.string().min(8), a: z.string().min(40) })).min(2),
  sources: z.array(z.string().url()).min(1),
  last_verified: isoDate,
  statute_quote: z.object({
    text: z.string().min(40),
    attribution: z.string().min(5)
  }).optional()
});
export type OffenceRecord = z.infer<typeof OffenceSchema>;
