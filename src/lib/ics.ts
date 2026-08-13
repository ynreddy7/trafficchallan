// Minimal RFC 5545 builder for the all-day Lok Adalat reminder file.
// Deliberately pure: the DTSTAMP date is passed in by the caller (build date),
// never read from the clock, so output is deterministic and testable.

export interface IcsEvent {
  /** Stable identifier; callers pass `<slug>@trafficchallan.com`. */
  uid: string;
  /** ISO `YYYY-MM-DD` — rendered as an all-day DTSTART;VALUE=DATE. */
  date: string;
  summary: string;
  description?: string;
  /** Each entry N emits a display VALARM with TRIGGER:-P<N>D. */
  alarmDaysBefore?: number[];
}

const CRLF = '\r\n';
const encoder = new TextEncoder();

/** RFC 5545 TEXT escaping: backslash, semicolon, comma, newline. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Fold a content line to 75 octets max (RFC 5545 §3.1). Continuation lines
 * begin with a single space (which counts toward their 75 octets). Splits on
 * code points, never inside a multi-byte UTF-8 sequence.
 */
export function foldIcsLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let currentOctets = 0;
  for (const ch of line) {
    const octets = encoder.encode(ch).length;
    if (currentOctets + octets > 75) {
      parts.push(current);
      current = ' ' + ch;
      currentOctets = 1 + octets;
    } else {
      current += ch;
      currentOctets += octets;
    }
  }
  parts.push(current);
  return parts.join(CRLF);
}

const dateToIcs = (iso: string): string => iso.replace(/-/g, '');

/**
 * Build a VCALENDAR string. `dtstampDate` is the ISO `YYYY-MM-DD` build date
 * (required — keeps this function pure); it is stamped as midnight UTC.
 */
export function buildIcs(events: IcsEvent[], dtstampDate: string): string {
  const dtstamp = dateToIcs(dtstampDate) + 'T000000Z';
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//trafficchallan.com//challan-discount//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + event.uid);
    lines.push('DTSTAMP:' + dtstamp);
    // All-day event; with no DTEND a VALUE=DATE start covers exactly that day.
    lines.push('DTSTART;VALUE=DATE:' + dateToIcs(event.date));
    lines.push('SUMMARY:' + escapeIcsText(event.summary));
    if (event.description !== undefined) {
      lines.push('DESCRIPTION:' + escapeIcsText(event.description));
    }
    for (const days of event.alarmDaysBefore ?? []) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:' + escapeIcsText(event.summary));
      lines.push(`TRIGGER:-P${days}D`);
      lines.push('END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}
