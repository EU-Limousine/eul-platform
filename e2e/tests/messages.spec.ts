import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Website translation files (no browser needed). next-intl uses ICU messages:
 *   "passengers": "{count, plural, one {# passenger} other {# passengers}}"
 * The i18next style ("passengers_one" / "passengers_other") is for the DASHBOARD only; on the
 * website it shows the raw key (e.g. "booking.price.passengers") to customers.
 */
const DIR = path.resolve(__dirname, '../../apps/website/messages');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.json'));

type Tree = { [key: string]: string | Tree | unknown[] };
function leaves(tree: Tree, prefix = ''): [string, unknown][] {
  return Object.entries(tree).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? leaves(v as Tree, `${prefix}${k}.`) : [[`${prefix}${k}`, v] as [string, unknown]],
  );
}

test.describe('Website translation files', () => {
  test('all 7 languages are present', () => {
    expect(FILES.sort()).toEqual(['da.json', 'de.json', 'en.json', 'es.json', 'fr.json', 'it.json', 'rm.json']);
  });

  for (const file of FILES) {
    test(`${file}: no i18next-style plural keys (_one/_other)`, () => {
      const tree = JSON.parse(readFileSync(path.join(DIR, file), 'utf8')) as Tree;
      const wrong = leaves(tree)
        .map(([key]) => key)
        .filter((key) => /_(zero|one|two|few|many|other)$/.test(key));
      expect(wrong, `use ICU plural syntax instead: {count, plural, one {…} other {…}}`).toEqual([]);
    });

    test(`${file}: every message is valid ICU`, async () => {
      // intl-messageformat is the parser next-intl itself uses.
      const { IntlMessageFormat } = await import('intl-messageformat');
      const locale = file.replace('.json', '');
      const tree = JSON.parse(readFileSync(path.join(DIR, file), 'utf8')) as Tree;
      const broken: string[] = [];
      for (const [key, value] of leaves(tree)) {
        if (typeof value !== 'string') continue;
        try {
          new IntlMessageFormat(value, locale);
        } catch (e) {
          broken.push(`${key}: ${(e as Error).message}`);
        }
      }
      expect(broken).toEqual([]);
    });
  }
});
