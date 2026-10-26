/// <reference types="node" />
/**
 * Validates store/listing.md against App Store Connect field limits.
 * Usage: npm run check-listing
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LIMITS: Record<string, number> = {
  Name: 30,
  Subtitle: 30,
  'Promotional text': 170,
  Description: 4000,
  Keywords: 100,
  "What's New": 4000,
};

const md = readFileSync(join(__dirname, '..', 'store', 'listing.md'), 'utf8');
const sections = new Map<string, string>();
const parts = md.split(/^## /m).slice(1);
for (const part of parts) {
  const [heading = '', ...body] = part.split('\n');
  const key = heading.replace(/\s*\(.*$/, '').trim();
  sections.set(key, body.join('\n').trim());
}

let failed = 0;
for (const [field, limit] of Object.entries(LIMITS)) {
  const text = sections.get(field);
  if (text === undefined) {
    console.error(`✖ ${field}: missing`);
    failed++;
    continue;
  }
  const length = [...text].length;
  const ok = length <= limit;
  if (!ok) failed++;
  console.log(`${ok ? '✔' : '✖'} ${field.padEnd(17)} ${String(length).padStart(4)} / ${limit}`);
}
const keywords = sections.get('Keywords') ?? '';
if (/,\s/.test(keywords)) {
  console.error('✖ Keywords: remove spaces after commas (they count against the limit)');
  failed++;
}
process.exit(failed ? 1 : 0);
