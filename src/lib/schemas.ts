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

/**
 * Discount/amnesty scheme status. Honesty rules (CONTENT_STANDARDS 11):
 * - `rumour` = press/social claims with no G.O. — rumoured percentages must
 *   NEVER appear in percent_by_class (schema enforces).
 * - `proposal` = officially proposed but not enacted; also no percentages.
 * - `none` = verified absence of a scheme ("no scheme, verified" is the product).
 */
export const SchemeStatus = z.enum(['live', 'announced', 'closed', 'proposal', 'rumour', 'none']);
export type SchemeStatusType = z.infer<typeof SchemeStatus>;

export const SchemeSchema = z
  .object({
    slug: z.string().regex(/^[a-z][a-z-]*$/),
    state_name: z.string().min(2),
    status: SchemeStatus,
    scheme_name: z.string().min(3).optional(),
    // vehicle-class label -> plain-text discount, e.g. { "two_three_wheelers": "80% waived (pay 20%)" }
    percent_by_class: z.record(z.string().min(2), z.string().min(2)).optional(),
    window: z.object({ start: isoDate, end: isoDate.optional() }).optional(),
    order_ref: z.string().min(5).optional(),
    note: z.string().min(30),
    history: z.array(z.object({
      period: z.string().min(4),
      summary: z.string().min(20),
      sources: z.array(z.string().url()).min(1)
    })).default([]),
    sources: z.array(z.string().url()).min(1),
    last_verified: isoDate
  })
  .superRefine((rec, ctx) => {
    if (rec.percent_by_class && !['live', 'announced', 'closed'].includes(rec.status)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `percent_by_class is only allowed for live/announced/closed schemes, not status "${rec.status}"`
      });
    }
    if ((rec.status === 'live' || rec.status === 'announced') && !rec.window) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `status "${rec.status}" requires a window`
      });
    }
    if (rec.window?.end && rec.window.end < rec.window.start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `window end ${rec.window.end} is before start ${rec.window.start}`
      });
    }
  });
export type SchemeRecord = z.infer<typeof SchemeSchema>;

export const LokAdalatSchema = z.object({
  national_sittings: z.array(z.object({
    date: isoDate,
    status: z.enum(['held', 'scheduled'])
  })).min(1),
  delhi_token: z.object({
    portal: z.string().url(),
    opens_days_before: z.number().int().positive(),
    daily_cap_note: z.string().min(30),
    limits_note: z.string().min(30)
  }),
  delhi_extras: z.object({
    digital_lok_adalat_note: z.string().min(30),
    evening_courts_url: z.string().url(),
    weekend_courts_note: z.string().min(30)
  }),
  state_notes: z.array(z.object({
    state_slug: z.string().regex(/^[a-z][a-z-]*$/),
    note: z.string().min(30)
  })),
  sources: z.array(z.string().url()).min(1),
  last_verified: isoDate
});
export type LokAdalatRecord = z.infer<typeof LokAdalatSchema>;

export const RtoStateSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z-]*$/),
  state_name: z.string().min(2),
  series: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1),
  codes: z.array(z.object({
    code: z.string().regex(/^[A-Z]{2}[0-9]{1,2}$/),
    office: z.string().min(3)
  })).min(1),
  verification: z.object({
    method: z.enum(['full', 'sampled']),
    sample_size: z.number().int().nonnegative().optional(),
    official_list_available: z.boolean()
  }),
  sources: z.array(z.string().url()).min(1),
  last_verified: isoDate
});
export type RtoStateRecord = z.infer<typeof RtoStateSchema>;
