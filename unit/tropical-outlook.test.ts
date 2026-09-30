import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchTropicalOutlook } from '../netlify/functions/tropical.ts';

// Real NHC Tropical Weather Outlook text, wrapped the way the TWOAT.xml
// feed serves it (a single <item><description> with a CDATA block).
function twoatXml(bodyText: string): string {
  return `<?xml version="1.0"?>\n<rss><channel><item><description><![CDATA[${bodyText}]]></description></item></channel></rss>`;
}

function stubFetchOnce(xml: string) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    text: async () => xml,
  })) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

test('an area whose text has no parsable formation statement is skipped, not reported as "not expected"', async () => {
  // The North Atlantic section here uses NHC's "Formation chance through
  // 48 hours...medium" phrasing with no "Tropical cyclone formation..."
  // sentence, so the parser cannot read a statement out of it. It must
  // not fall back to claiming formation is not expected.
  const body = `
000
ABNT20 KNHC 301741
TWOAT

Tropical Weather Outlook
NWS National Hurricane Center Miami FL
200 PM EDT Wed Sep 30 2026

For the North Atlantic High Seas:

Central Subtropical Atlantic: An area of low pressure could form. Formation chance through 48 hours...medium...40 percent. Formation chance through 5 days...medium...50 percent.

Caribbean Sea: Tropical cyclone formation is not expected during the next 7 days.

$$
Forecaster Papin
`;
  const restore = stubFetchOnce(twoatXml(body));
  try {
    const { items } = await fetchTropicalOutlook();

    const northAtlantic = items.find((item) => item.area === 'North Atlantic');
    assert.equal(northAtlantic, undefined, 'an unparsable area must not appear with an invented description');
    assert.ok(
      !items.some((item) => /not expected/i.test(item.description) && item.area === 'North Atlantic'),
      'no item may claim formation is "not expected" for text that never said so'
    );

    // The Caribbean section did have a parsable statement, so it should
    // still come through unaffected by the fix.
    const caribbean = items.find((item) => item.area === 'Caribbean Sea');
    assert.ok(caribbean, 'a parsable area must still be reported');
    assert.match(caribbean!.description, /not expected/i);
  } finally {
    restore();
  }
});
